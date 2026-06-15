"""Reword the 7 ambiguous 'before/after/above/below' prompts IN PLACE via
PATCH /api/admin/questions/{id} — preserves student data, ids, and prerequisites.
Answers and choices are unchanged; only the prompt gains 'مباشرةً'."""
import json
import urllib.request

BASE = "http://127.0.0.1:8000/api"

# exact current prompt -> corrected (decisive) prompt
EDITS = {
    "ما العدد الذي يأتي قبل ٦٠؟": "ما العدد الذي يأتي قبل ٦٠ مباشرةً؟",
    "ما العدد الذي يأتي بعد ٢٩؟": "ما العدد الذي يأتي بعد ٢٩ مباشرةً؟",
    "ما العدد الذي يأتي بعد ٨٩؟": "ما العدد الذي يأتي بعد ٨٩ مباشرةً؟",
    "ما العدد الذي يأتي قبل ٣٤؟": "ما العدد الذي يأتي قبل ٣٤ مباشرةً؟",
    "في لوحة المائة، ما العدد فوق ٦٨؟": "في لوحة المائة، ما العدد فوق ٦٨ مباشرةً؟",
    "ما العدد الذي يأتي بعد ٩٩؟": "ما العدد الذي يأتي بعد ٩٩ مباشرةً؟",
    "في لوحة المائة، ما العدد تحت ١٨؟": "في لوحة المائة، ما العدد تحت ١٨ مباشرةً؟",
}


def req(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(BASE + path, data=data,
                               headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())


def main():
    questions = req("GET", "/admin/questions")
    by_prompt = {q["payload"].get("prompt"): q for q in questions}
    patched = []
    for old, new in EDITS.items():
        q = by_prompt.get(old)
        if q is None:
            raise SystemExit(f"NOT FOUND (already patched?): {old}")
        payload = dict(q["payload"])
        payload["prompt"] = new  # answer + choices unchanged
        updated = req("PATCH", f"/admin/questions/{q['id']}", {"payload": payload})
        patched.append(updated["id"])
    print(f"PATCHED {len(patched)} questions: ids {patched}")


if __name__ == "__main__":
    main()
