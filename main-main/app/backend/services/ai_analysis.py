"""
AI-powered student weakness analysis service.
Uses AI to analyze wrong answers and suggest personalized lessons/quizzes.
"""

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.quiz_attempts import Quiz_attempts
from models.questions import Questions
from models.quizzes import Quizzes
from models.lessons import Lessons
from models.subjects import Subjects
from schemas.aihub import ChatMessage, GenTxtRequest
from services.aihub import AIHubService

logger = logging.getLogger(__name__)


async def get_student_wrong_answers(db: AsyncSession, user_id: str) -> list[dict]:
    """Fetch all quiz attempts and identify wrong answers for a student."""
    # Get all quiz attempts for this student
    result = await db.execute(
        select(Quiz_attempts).where(Quiz_attempts.user_id == user_id)
    )
    attempts = result.scalars().all()

    wrong_answers = []
    for attempt in attempts:
        if not attempt.answers:
            continue
        try:
            answers_data = json.loads(attempt.answers)
        except (json.JSONDecodeError, TypeError):
            continue

        # Get questions for this quiz
        q_result = await db.execute(
            select(Questions).where(Questions.quiz_id == attempt.quiz_id)
        )
        questions = q_result.scalars().all()
        question_map = {q.id: q for q in questions}

        for answer in answers_data:
            q_id = answer.get("question_id")
            student_answer = answer.get("answer")
            question = question_map.get(q_id)
            if question and student_answer != question.correct_answer:
                wrong_answers.append({
                    "question_text": question.question_text,
                    "student_answer": student_answer,
                    "correct_answer": question.correct_answer,
                    "skill": question.skill,
                    "explanation": question.explanation or "",
                    "quiz_id": attempt.quiz_id,
                })

    return wrong_answers


async def get_available_resources(db: AsyncSession) -> dict:
    """Get all available lessons and quizzes for recommendations."""
    # Get subjects
    subj_result = await db.execute(select(Subjects))
    subjects = subj_result.scalars().all()

    # Get lessons
    lesson_result = await db.execute(select(Lessons))
    lessons = lesson_result.scalars().all()

    # Get quizzes
    quiz_result = await db.execute(select(Quizzes))
    quizzes = quiz_result.scalars().all()

    return {
        "subjects": [{"id": s.id, "name": s.name, "grade": s.grade} for s in subjects],
        "lessons": [{"id": l.id, "title": l.title, "subject_id": l.subject_id, "grade": l.grade} for l in lessons],
        "quizzes": [{"id": q.id, "title": q.title, "lesson_id": q.lesson_id, "subject_id": q.subject_id, "difficulty": q.difficulty} for q in quizzes],
    }


async def analyze_student_weaknesses(db: AsyncSession, user_id: str) -> dict[str, Any]:
    """
    Use AI to analyze student wrong answers and generate personalized recommendations.
    """
    wrong_answers = await get_student_wrong_answers(db, user_id)
    resources = await get_available_resources(db)

    if not wrong_answers:
        return {
            "has_data": False,
            "message": "لا توجد بيانات كافية لتحليل نقاط الضعف. أكمل بعض الاختبارات أولاً.",
            "weaknesses": [],
            "recommendations": [],
        }

    # Build the AI prompt
    wrong_answers_text = json.dumps(wrong_answers[:20], ensure_ascii=False, indent=2)
    resources_text = json.dumps(resources, ensure_ascii=False, indent=2)

    prompt = f"""أنت مساعد تعليمي ذكي في أكاديمية فيثاغورث. مهمتك تحليل إجابات الطالب الخاطئة وتحديد نقاط ضعفه واقتراح دروس واختبارات مخصصة.

## الإجابات الخاطئة للطالب:
{wrong_answers_text}

## الموارد التعليمية المتاحة (دروس واختبارات):
{resources_text}

## المطلوب:
حلل الإجابات الخاطئة وأجب بصيغة JSON فقط (بدون أي نص إضافي) بالشكل التالي:
{{
  "weaknesses": [
    {{
      "skill": "اسم المهارة الضعيفة",
      "severity": "high/medium/low",
      "description": "وصف مختصر لنقطة الضعف",
      "error_count": عدد الأخطاء في هذه المهارة
    }}
  ],
  "recommendations": [
    {{
      "type": "lesson/quiz",
      "id": رقم الدرس أو الاختبار,
      "title": "عنوان الدرس أو الاختبار",
      "reason": "سبب التوصية"
    }}
  ],
  "summary": "ملخص عام لأداء الطالب ونصائح للتحسين"
}}

أجب بالعربية فقط. أعط 3-5 نقاط ضعف و3-5 توصيات كحد أقصى."""

    # Call AI service
    service = AIHubService()
    request = GenTxtRequest(
        messages=[
            ChatMessage(role="system", content="أنت مساعد تعليمي ذكي متخصص في تحليل أداء الطلاب."),
            ChatMessage(role="user", content=prompt),
        ],
        model="deepseek-v3.2",
        stream=False,
        temperature=0.3,
        max_tokens=2048,
    )

    response = await service.gentxt(request)
    ai_content = response.content

    # Parse AI response
    try:
        # Try to extract JSON from the response
        json_start = ai_content.find("{")
        json_end = ai_content.rfind("}") + 1
        if json_start != -1 and json_end > json_start:
            analysis = json.loads(ai_content[json_start:json_end])
        else:
            analysis = json.loads(ai_content)
    except (json.JSONDecodeError, ValueError):
        logger.warning(f"Failed to parse AI response as JSON: {ai_content[:200]}")
        analysis = {
            "weaknesses": [{"skill": "عام", "severity": "medium", "description": "يحتاج الطالب لمراجعة المواد", "error_count": len(wrong_answers)}],
            "recommendations": [],
            "summary": ai_content[:500] if ai_content else "يرجى مراجعة الدروس والاختبارات لتحسين المستوى.",
        }

    return {
        "has_data": True,
        "message": "تم تحليل أداء الطالب بنجاح",
        "total_wrong_answers": len(wrong_answers),
        **analysis,
    }