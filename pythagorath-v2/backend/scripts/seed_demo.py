"""Seed a small demo dataset for the frontend. Run on a fresh DB at head:
    python -m scripts.seed_demo

Question payloads carry the visual spec + answer choices the child UI renders:
  { prompt, answer, visual:{type,data}, choices:[...] }

Two subjects support the mastery loop demo (F-4):
  - الرياضيات: one skill with several visual questions -> can be MASTERED.
  - العلوم: a skill locked behind an unmastered prerequisite -> answering it
    yields a kind "locked" message (403), never a technical error.
"""
from app.core.database import SessionLocal
import app.models as m


def main():
    s = SessionLocal()
    country = m.Country(name="الإمارات"); s.add(country); s.flush()
    cur = m.Curriculum(country_id=country.id, name="منهج الإمارات"); s.add(cur); s.flush()
    grade = m.Grade(curriculum_id=cur.id, name="الصف الثاني", order=2); s.add(grade); s.flush()

    # ---- Math: a counting skill the child can master ----
    math = m.Subject(grade_id=grade.id, name="الرياضيات"); s.add(math); s.flush()
    unit = m.Unit(subject_id=math.id, name="العدّ والجمع", order=1); s.add(unit); s.flush()
    skill = m.Skill(unit_id=unit.id, name="العدّ ضمن ١٠", order=1,
                    mastery_threshold=0.8); s.add(skill); s.flush()
    visuals = [
        ("counting-objects", {"emoji": "🍎", "count": 7, "arrangement": "grid"}, "كم عدد التفاحات؟", "7", ["5", "6", "7", "8"]),
        ("number-line", {"start": 0, "end": 10, "highlight": [4]}, "ما الرقم المُبرَز؟", "4", ["3", "4", "5", "6"]),
        ("counting-objects", {"emoji": "⭐", "count": 5, "arrangement": "line"}, "كم عدد النجوم؟", "5", ["4", "5", "6", "7"]),
        ("counting-objects", {"emoji": "🍌", "count": 6, "arrangement": "grid"}, "كم عدد الموز؟", "6", ["5", "6", "7", "8"]),
    ]
    for itype, data, prompt, ans, choices in visuals:
        s.add(m.Question(skill_id=skill.id, interaction_type=itype, difficulty=1,
                         payload={"prompt": prompt, "answer": ans,
                                  "visual": {"type": itype, "data": data},
                                  "choices": choices}))

    # second math skill, unlocked after the first — used to show an in-progress row
    skill2 = m.Skill(unit_id=unit.id, name="الجمع ضمن ١٠", order=2,
                     mastery_threshold=0.8); s.add(skill2); s.flush()
    s.add(m.SkillPrerequisite(skill_id=skill2.id, prerequisite_skill_id=skill.id))
    for itype, data, prompt, ans, choices in [
        ("counting-objects", {"emoji": "🍏", "count": 8, "arrangement": "grid"}, "كم عدد التفاحات الخضراء؟", "8", ["6", "7", "8", "9"]),
        ("counting-objects", {"emoji": "🌸", "count": 9, "arrangement": "grid"}, "كم عدد الزهور؟", "9", ["7", "8", "9", "10"]),
    ]:
        s.add(m.Question(skill_id=skill2.id, interaction_type=itype, difficulty=1,
                         payload={"prompt": prompt, "answer": ans,
                                  "visual": {"type": itype, "data": data},
                                  "choices": choices}))

    # ---- Science: a skill LOCKED behind an unmastered prerequisite ----
    sci = m.Subject(grade_id=grade.id, name="العلوم"); s.add(sci); s.flush()
    su = m.Unit(subject_id=sci.id, name="الفضاء", order=1); s.add(su); s.flush()
    # prerequisite skill with no questions -> never practised -> never mastered
    base = m.Skill(unit_id=su.id, name="أساسيات الفضاء", order=0,
                   mastery_threshold=0.8); s.add(base); s.flush()
    planets = m.Skill(unit_id=su.id, name="الكواكب", order=1,
                      mastery_threshold=0.8); s.add(planets); s.flush()
    s.add(m.SkillPrerequisite(skill_id=planets.id, prerequisite_skill_id=base.id))
    # the only question in العلوم belongs to the LOCKED skill
    s.add(m.Question(skill_id=planets.id, interaction_type="counting-objects",
                     difficulty=1,
                     payload={"prompt": "كم عدد الكواكب؟", "answer": "3",
                              "visual": {"type": "counting-objects",
                                         "data": {"emoji": "🪐", "count": 3, "arrangement": "line"}},
                              "choices": ["2", "3", "4", "5"]}))

    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    s.add(m.Student(user_id=parent.id, name="أحمد", grade_id=grade.id,
                    country_id=country.id))
    s.commit()
    print(f"seeded: math skill#{skill.id} ({len(visuals)} questions, masterable); "
          f"science skill#{planets.id} 'الكواكب' locked behind #{base.id}; student 'أحمد'")
    s.close()


if __name__ == "__main__":
    main()
