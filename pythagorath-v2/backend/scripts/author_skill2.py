"""Re-author skill 'ما بين العقود' as interactive number-line questions (the
agreed model). Replaces the skill's old questions with the 15 reviewed ones,
via the admin API only. Keeps the skill entity, order, threshold, prerequisite."""
import json
import urllib.request

B = "http://127.0.0.1:8000/api"
LINE = {"min": 0, "max": 100, "step": 10}

# (difficulty, prompt, answer)
QUESTIONS = [
    (1, "ضع العلامة على العقد ٤٠.", "٤٠"),
    (1, "ضع العلامة على العقد ٧٠.", "٧٠"),
    (1, "ما العقد بعد ٢٠ مباشرةً؟ ضع العلامة عليه.", "٣٠"),
    (1, "ما العقد بعد ٨٠ مباشرةً؟ ضع العلامة عليه.", "٩٠"),
    (1, "ما العقد قبل ٦٠ مباشرةً؟ ضع العلامة عليه.", "٥٠"),
    (1, "أكمل العدّ بالعشرات: ١٠، ٢٠، ٣٠، ضع العلامة على التالي.", "٤٠"),
    (1, "أكمل العدّ بالعشرات: ٤٠، ٥٠، ٦٠، ضع العلامة على التالي.", "٧٠"),
    (2, "ضع العلامة على العقد الذي يقع بين ٤٠ و ٦٠.", "٥٠"),
    (2, "ضع العلامة على العقد الذي يقع بين ٧٠ و ٩٠.", "٨٠"),
    (2, "أكمل تنازلياً بالعشرات: ١٠٠، ٩٠، ٨٠، ضع العلامة على التالي.", "٧٠"),
    (2, "ما العقد الذي يقع في منتصف الطريق بين ٢٠ و ٤٠؟", "٣٠"),
    (2, "ما العقد الذي يقع في منتصف الطريق بين ٦٠ و ٨٠؟", "٧٠"),
    (3, "ابدأ من ٣٠، اقفز ثلاث عشرات للأمام، ضع العلامة.", "٦٠"),
    (3, "ابدأ من ٥٠، اقفز عشرتين، ضع العلامة.", "٧٠"),
    (3, "ابدأ من ٢٠، اقفز أربع عشرات، ضع العلامة.", "٦٠"),
]


def api(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(B + path, data=data,
                                 headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main():
    skills = api("GET", "/admin/skills")
    skill = next(s for s in skills if s["name"].startswith("ما بين العقود"))
    sid = skill["id"]
    questions = api("GET", "/admin/questions")
    old = [q for q in questions if q["skill_id"] == sid]
    print(f"skill '{skill['name']}' (#{sid}, threshold {skill['mastery_threshold']}): "
          f"{len(old)} old questions -> deleting")
    for q in old:
        urllib.request.urlopen(urllib.request.Request(
            f"{B}/admin/questions/{q['id']}", method="DELETE"))

    for diff, prompt, answer in QUESTIONS:
        api("POST", "/admin/questions", {
            "skill_id": sid, "interaction_type": "number-line", "difficulty": diff,
            "payload": {"prompt": prompt, "answer": answer, "line": LINE},
        })
    print(f"added {len(QUESTIONS)} interactive number-line questions to skill #{sid}")


if __name__ == "__main__":
    main()
