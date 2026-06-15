"""Wipe ALL progress + student/parent rows (explicit order, no reliance on FK
cascade). Content tables (countries..questions, skill_prerequisites) untouched.
Run with the backend STOPPED to avoid locks."""
import sqlite3


def main():
    c = sqlite3.connect("pythagorath_dev.db")
    c.execute("PRAGMA foreign_keys=ON")
    for tbl in ("answer_log", "skill_mastery", "learning_path", "students", "users"):
        c.execute(f"delete from {tbl}")
    c.commit()
    counts = {t: c.execute(f"select count(*) from {t}").fetchone()[0]
              for t in ("answer_log", "skill_mastery", "students", "users",
                        "skills", "questions")}
    c.close()
    print("after reset:", counts)


if __name__ == "__main__":
    main()
