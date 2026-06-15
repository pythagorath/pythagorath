"""FastAPI application entry point (foundation skeleton)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import answer, audio, catalog, diagnostic, students
from app.routers.admin.routes import admin_router

app = FastAPI(title="Pythagorath", version="0.1.0")

# Allow the Vite dev frontend to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(answer.router, prefix="/api")
app.include_router(audio.router, prefix="/api")
app.include_router(diagnostic.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
