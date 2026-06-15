"""Prove التقدير is now masterable after adding difficulty-3 questions.
التقدير is locked behind العدّ بالقفز (which is behind لوحة المائة), so a throwaway
student masters the chain, then masters التقدير by solving a HARD item in-window."""
import json
import urllib.error
import urllib.request

B = "http://127.0.0.1:8000"


def api(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(B + path, data=data,
                                 headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_err": e.code, "detail": json.loads(e.read()).get("detail")}


def by_diff(skill_id, questions):
    d = {}
    for q in questions:
        if q["skill_id"] == skill_id:
            d.setdefault(q["difficulty"], []).append(q)
    return d


def submit(sid, q):
    return api("POST", "/api/submit_answer",
               {"student_id": sid, "question_id": q["id"], "answer": q["payload"]["answer"]})


def master(sid, skill_id, questions):
    d = by_diff(skill_id, questions)
    picks = d.get(1, [])[:4] + [d.get(3, [])[0]]  # 4 easy + 1 hard, all correct
    last = None
    for q in picks:
        last = submit(sid, q)
    return last, picks[-1]


def main():
    skills = {s["order"]: s for s in api("GET", "/api/admin/skills")}
    questions = api("GET", "/api/admin/questions")

    taqdir_qs = [q for q in questions if q["skill_id"] == skills[4]["id"]]
    from collections import Counter
    print("التقدير difficulty distribution now:",
          dict(sorted(Counter(q["difficulty"] for q in taqdir_qs).items())),
          f"(total {len(taqdir_qs)} questions)")
    hard3 = [q for q in taqdir_qs if q["difficulty"] == 3]
    print("difficulty-3 questions in التقدير:")
    for q in hard3:
        print(f"  q#{q['id']}: {q['payload']['prompt']} -> {q['payload']['answer']}")

    sid = api("POST", "/api/students", {"name": "اختبار-تقدير", "grade_id": 1, "country_id": 1})["id"]
    print(f"\nthrowaway student #{sid} — mastering the chain to unlock التقدير:")
    for order, label in [(1, "لوحة المائة"), (3, "العدّ بالقفز")]:
        r, _ = master(sid, skills[order]["id"], questions)
        print(f"  mastered '{label}'? status={r['status']}")
        assert r["status"] == "mastered"

    print("\nNow التقدير is unlocked — master it via a HARD item in-window:")
    r, hardq = master(sid, skills[4]["id"], questions)
    print(f"  used hard q#{hardq['id']} (d{hardq['difficulty']}): {hardq['payload']['prompt']}")
    print(f"  -> التقدير status={r['status']} level={r['mastery_level']:.2f} attempts={r['attempts']}")
    assert r["status"] == "mastered", "FAIL: التقدير should be masterable now!"
    print("  => التقدير MASTERED — the new difficulty-3 question satisfied the hard rule.")


if __name__ == "__main__":
    main()
