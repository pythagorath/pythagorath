"""Test harness for the constitutional core (Bundle 0 — the safety net).

Pins the PROVEN behaviour of the gates / diagnostic / admin guard / phrasing so the
substrate migration (Postgres + Alembic, then accounts) cannot silently break the
logic. The app code is NOT modified by these tests — they only call it.

Each test gets a FRESH, isolated SQLite database (temp file), created from the same
SQLAlchemy models and seeded with the real 14-node network. The app's own startup
seeding is bypassed (TestClient is used without its lifespan context), so nothing
here writes to the real dev database. The DB engine is intentionally swappable —
the same suite must pass unchanged against Postgres in Bundle 1.
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import admin, auth, main, models, seed
from app.db import Base, get_db
from app.gate import grade
from app.models import Answer, Question, Skill, Student, Subscription, User
from app import gate


@pytest.fixture(autouse=True)
def _reset_ratelimit():
    """The OTP send-limiter is in-process (module-level state); clear it around every test so the
    fixed window never leaks counts between cases."""
    from app import ratelimit
    ratelimit.reset()
    yield
    ratelimit.reset()


@pytest.fixture()
def db_setup(tmp_path):
    """A fresh seeded database for one test. Returns a sessionmaker bound to it."""
    url = f"sqlite:///{tmp_path / 'test.db'}"
    engine = create_engine(url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    s = TestSession()
    try:
        seed.seed(s)
    finally:
        s.close()
    yield TestSession
    engine.dispose()


@pytest.fixture()
def db(db_setup):
    s = db_setup()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture()
def _wired(db_setup):
    """Activate the test-DB override on the shared app; yield a factory that makes
    fresh TestClients (each with its own cookie jar, all on the same test DB)."""
    def override():
        s = db_setup()
        try:
            yield s
        finally:
            s.close()

    main.app.dependency_overrides[get_db] = override   # one shared dependency
    try:
        yield lambda: TestClient(main.app)   # no `with`: real-DB startup never runs
    finally:
        main.app.dependency_overrides.clear()


def _authed(make, db_setup, email, role="guardian"):
    """A client logged in as a (possibly admin) user."""
    if role == "admin":
        s = db_setup()
        try:
            Helpers.make_user(s, email, role="admin")
        finally:
            s.close()
        c = make()
        c.post("/api/auth/login", json={"email": email, "password": "password123"})
    else:
        c = make()
        c.post("/api/auth/register", json={"email": email, "password": "password123"})
        c.post("/api/auth/login", json={"email": email, "password": "password123"})
    return c


@pytest.fixture()
def client(_wired):
    """Unauthenticated client (used by auth tests and as the anonymous baseline)."""
    return _wired()


@pytest.fixture()
def anon_client(_wired):
    return _wired()


def _grant_access(db_setup, email, days=30):
    """Give a user an active subscription (so paywalled content opens). Lets the
    educational tests run unaffected by the commercial gate."""
    s = db_setup()
    try:
        u = s.execute(select(User).where(User.email == email)).scalars().first()
        s.add(Subscription(user_id=u.id, status="active",
                           access_until=datetime.now(timezone.utc) + timedelta(days=days)))
        s.commit()
    finally:
        s.close()


@pytest.fixture()
def guardian_client(_wired, db_setup):
    c = _authed(_wired, db_setup, "guardian1@x.com")
    _grant_access(db_setup, "guardian1@x.com")
    return c


@pytest.fixture()
def other_guardian_client(_wired, db_setup):
    c = _authed(_wired, db_setup, "guardian2@x.com")
    _grant_access(db_setup, "guardian2@x.com")
    return c


@pytest.fixture()
def unsubscribed_client(_wired, db_setup):
    """A logged-in guardian with NO subscription — for paywall (402) tests."""
    return _authed(_wired, db_setup, "nosub@x.com")


@pytest.fixture()
def admin_client(_wired, db_setup):
    return _authed(_wired, db_setup, "admin@x.com", role="admin")


class Helpers:
    """Reusable test operations (kept out of the app)."""

    @staticmethod
    def skill(db, code) -> Skill:
        return db.execute(select(Skill).where(Skill.code == code)).scalars().one()

    @staticmethod
    def questions(db, skill_id, family=None, published_only=True):
        q = select(Question).where(Question.skill_id == skill_id)
        if published_only:
            q = q.where(Question.status == "published")
        if family:
            q = q.where(Question.family == family)
        return db.execute(q.order_by(Question.id)).scalars().all()

    @staticmethod
    def grade_id(db):
        """الصف الثاني — the default target grade in tests (pinned by NAME, not position:
        the seed now also creates الصف الأول, order=1)."""
        from app.models import Grade
        return db.execute(select(Grade.id).where(Grade.name == "الصف الثاني")).scalars().first()

    @staticmethod
    def grade1_id(db):
        """الصف الأول — the G1 target grade (batch-1)."""
        from app.models import Grade
        return db.execute(select(Grade.id).where(Grade.name == "الصف الأول")).scalars().first()

    @staticmethod
    def student(db, name="طالب", country=None, grade_id=None) -> Student:
        if grade_id is None:
            grade_id = Helpers.grade_id(db)
        s = Student(name=name, country=country, grade_id=grade_id)
        db.add(s)
        db.commit()
        db.refresh(s)
        return s

    @staticmethod
    def answer(db, student_id, question, correct=True, elapsed_ms=1000):
        """Insert one graded answer and recompute the gate; return the snapshot."""
        given = question.answer if correct else (question.answer + "X")
        a = Answer(
            student_id=student_id,
            question_id=question.id,
            is_correct=grade(question, given),
            elapsed_ms=elapsed_ms,
        )
        db.add(a)
        db.flush()
        snap = gate.recompute(db, student_id, question.skill_id)
        db.commit()
        return snap

    @staticmethod
    def reach_understood_multi(db, student_id, skill):
        """Answer one question from each of the first two families correctly."""
        fams = []
        for q in Helpers.questions(db, skill.id):
            if q.family not in fams:
                fams.append(q.family)
                Helpers.answer(db, student_id, q, correct=True)
            if len(fams) >= 2:
                break

    @staticmethod
    def now():
        return datetime.now(timezone.utc)

    # ----- auth helpers -----
    @staticmethod
    def make_user(db, email, password="password123", role="guardian") -> User:
        u = User(email=email, password_hash=auth.hash_password(password), role=role)
        db.add(u)
        db.commit()
        db.refresh(u)
        return u

    @staticmethod
    def register(client, email, password="password123"):
        return client.post("/api/auth/register", json={"email": email, "password": password})

    @staticmethod
    def login(client, email, password="password123"):
        return client.post("/api/auth/login", json={"email": email, "password": password})


@pytest.fixture()
def h():
    return Helpers
