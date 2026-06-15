"""Aggregate admin router — mounts CRUD for the whole hierarchy under /admin."""
from fastapi import APIRouter

from app.models.content import Country, Curriculum, Grade, Subject, Unit
from app.models.skill import Question, Skill
from app.routers.admin import prerequisites
from app.routers.admin.crud_factory import make_crud_router
from app.schemas import admin as s

admin_router = APIRouter(prefix="/admin")

_entities = [
    ("/countries", Country, s.CountryCreate, s.CountryUpdate, s.CountryRead, "countries"),
    ("/curricula", Curriculum, s.CurriculumCreate, s.CurriculumUpdate, s.CurriculumRead, "curricula"),
    ("/grades", Grade, s.GradeCreate, s.GradeUpdate, s.GradeRead, "grades"),
    ("/subjects", Subject, s.SubjectCreate, s.SubjectUpdate, s.SubjectRead, "subjects"),
    ("/units", Unit, s.UnitCreate, s.UnitUpdate, s.UnitRead, "units"),
    ("/skills", Skill, s.SkillCreate, s.SkillUpdate, s.SkillRead, "skills"),
    ("/questions", Question, s.QuestionCreate, s.QuestionUpdate, s.QuestionRead, "questions"),
]

for prefix, model, create_s, update_s, read_s, tag in _entities:
    admin_router.include_router(
        make_crud_router(
            model=model,
            create_schema=create_s,
            update_schema=update_s,
            read_schema=read_s,
            tag=tag,
        ),
        prefix=prefix,
    )

admin_router.include_router(prerequisites.router, prefix="/prerequisites")
