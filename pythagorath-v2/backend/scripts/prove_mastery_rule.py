"""Prove the upgraded mastery rule on the LIVE backend (throwaway students):
  A) 5 EASY correct -> NOT mastered (no hard solved); then 1 HARD correct -> mastered.
  B) threshold 0.9 really raises the bar: 4/5 (=0.8) with a hard -> NOT mastered;
     5/5 -> mastered.
"""
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


def questions_by_difficulty(skill_id):
    qs = [q for q in api("GET", "/api/admin/questions") if q["skill_id"] == skill_id]
    easy = [q for q in qs if q["difficulty"] == 1]
    hard = [q for q in qs if q["difficulty"] >= 3]
    return easy, hard


def submit(sid, q, correct=True):
    ans = q["payload"]["answer"] if correct else "WRONG"
    return api("POST", "/api/submit_answer",
               {"student_id": sid, "question_id": q["id"], "answer": ans})


def main():
    # skill ids/thresholds
    skills = {s["order"]: s for s in api("GET", "/api/admin/skills")}
    s1, s3 = skills[1], skills[3]

    # ---------- PART A: include-the-hard ----------
    print("=" * 72)
    print(f"PART A — skill '{s1['name']}' (threshold {s1['mastery_threshold']})")
    print("=" * 72)
    A = api("POST", "/api/students", {"name": "اختبار-أ", "grade_id": 1, "country_id": 1})["id"]
    easy, hard = questions_by_difficulty(s1["id"])
    print("5 EASY (difficulty 1) answers, all correct:")
    last = None
    for q in easy[:5]:
        last = submit(A, q)
        print(f"  q#{q['id']} (d1) -> status={last['status']} level={last['mastery_level']:.2f} attempts={last['attempts']}")
    assert last["status"] != "mastered", "FAIL: mastered with only easy items!"
    print("  => NOT mastered: 5/5 correct, threshold met, but no HARD item solved.\n")

    print(f"Now 1 HARD (difficulty 3) answer correct — q#{hard[0]['id']}:")
    r = submit(A, hard[0])
    print(f"  -> status={r['status']} level={r['mastery_level']:.2f} attempts={r['attempts']}")
    assert r["status"] == "mastered", "FAIL: should be mastered after a hard correct!"
    print("  => MASTERED: window now contains a correct HARD item.\n")

    # ---------- PART B: threshold 0.9 raises the bar ----------
    # Use skill 1 (no prerequisite -> open for a fresh student; it has a hard item).
    print("=" * 72)
    print(f"PART B — skill '{s1['name']}' (threshold {s1['mastery_threshold']})")
    print("=" * 72)
    Bid = api("POST", "/api/students", {"name": "اختبار-ب", "grade_id": 1, "country_id": 1})["id"]
    easy3, hard3 = questions_by_difficulty(s1["id"])
    # window of 5: [easy WRONG, hard ✓, easy ✓, easy ✓, easy ✓] -> 4/5 = 0.80, has-hard
    seq = [(easy3[0], False), (hard3[0], True), (easy3[1], True), (easy3[2], True), (easy3[3], True)]
    last = None
    for q, ok in seq:
        last = submit(Bid, q, correct=ok)
    print(f"  after 4-correct-of-5 (incl. a HARD): level={last['mastery_level']:.2f} "
          f"status={last['status']}")
    assert last["status"] != "mastered", "FAIL: 0.8 should not pass a 0.9 threshold!"
    print("  => NOT mastered: level 0.80 < threshold 0.90 (at the old 0.8 it WOULD have).")
    # one more correct -> window 5/5 = 1.00
    r = submit(Bid, easy3[4], correct=True)
    print(f"  after one more correct: level={r['mastery_level']:.2f} status={r['status']}")
    assert r["status"] == "mastered", "FAIL: 5/5 with hard should master at 0.9!"
    print("  => MASTERED at 1.00 — 0.9 truly requires a higher bar (5/5 here).")

    print("\nthrowaway student ids (for cleanup):", A, Bid)


if __name__ == "__main__":
    main()
