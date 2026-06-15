"""Re-author skill 'لوحة المائة وأنماط الأعداد' as pure interactive number-line
(owner-reviewed). Replaces the skill's old questions via the admin API only.
Each question uses a focused windowed line (step 1) so the answer is a tick."""
import json
import urllib.request

B = "http://127.0.0.1:8000/api"

# (difficulty, prompt, answer, line_min, line_max)
QUESTIONS = [
    (1, "ضع العلامة على العدد بعد ٤٧ مباشرةً.", "٤٨", 45, 50),
    (1, "ضع العلامة على العدد بعد ٢٩ مباشرةً.", "٣٠", 25, 30),
    (1, "ضع العلامة على العدد بعد ٨٩ مباشرةً.", "٩٠", 85, 90),
    (1, "ضع العلامة على العدد قبل ٦٠ مباشرةً.", "٥٩", 55, 60),
    (1, "ضع العلامة على العدد قبل ٤٠ مباشرةً.", "٣٩", 35, 40),
    (1, "ضع العلامة على العدد قبل ٥٠ مباشرةً.", "٤٩", 45, 50),
    (2, "أكمل النمط: ١٦، ١٧، ١٨، ضع العلامة على التالي.", "١٩", 15, 20),
    (2, "أكمل النمط: ٧٤، ٧٥، ٧٦، ضع العلامة على التالي.", "٧٧", 73, 78),
    (2, "ما العدد الذي يزيد عشرة عن ٢٣؟ ضع العلامة عليه.", "٣٣", 30, 35),
    (2, "ما العدد الذي ينقص عشرة عن ٥٥؟ ضع العلامة عليه.", "٤٥", 40, 45),
    (2, "أكمل النمط: ٣٢، ٣٣، ٣٤، ضع العلامة على التالي.", "٣٥", 32, 38),
    (2, "ما العدد الذي يزيد عشرة عن ٥٢؟ ضع العلامة عليه.", "٦٢", 58, 64),
    (3, "ما العدد الذي يزيد عشرة عن ٤١؟ ضع العلامة عليه.", "٥١", 48, 54),
    (3, "أكمل النمط القطري: ٤١، ٥٢، ٦٣، ضع العلامة على التالي (يزيد ١١).", "٧٤", 70, 78),
    (3, "أكمل النمط القطري: ٢٥، ٣٦، ٤٧، ضع العلامة على التالي (يزيد ١١).", "٥٨", 54, 60),
]


def api(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(B + path, data=data,
                                 headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main():
    skill = next(s for s in api("GET", "/admin/skills") if s["name"].startswith("لوحة المائة"))
    sid = skill["id"]
    old = [q for q in api("GET", "/admin/questions") if q["skill_id"] == sid]
    print(f"skill '{skill['name']}' (#{sid}, threshold {skill['mastery_threshold']}): "
          f"{len(old)} old questions -> deleting")
    for q in old:
        urllib.request.urlopen(urllib.request.Request(
            f"{B}/admin/questions/{q['id']}", method="DELETE"))

    for diff, prompt, answer, lo, hi in QUESTIONS:
        api("POST", "/admin/questions", {
            "skill_id": sid, "interaction_type": "number-line", "difficulty": diff,
            "payload": {"prompt": prompt, "answer": answer,
                        "line": {"min": lo, "max": hi, "step": 1}},
        })
    print(f"added {len(QUESTIONS)} number-line questions to skill #{sid}")


if __name__ == "__main__":
    main()
