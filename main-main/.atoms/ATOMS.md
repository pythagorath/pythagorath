# Project Context

## Project Overview
أكاديمية فيثاغورث - Educational platform for Arabic-speaking students with subjects, lessons, quizzes, points system, and role-based dashboards.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-05-19 | Use Atoms Cloud backend with auto-generated CRUD | Alex | Fastest path to MVP |
| 2026-05-19 | RTL Arabic UI with shadcn/ui | Alex | Target audience is Arabic-speaking |
| 2026-05-19 | Role-based access (student, parent, admin) | Alex | Per requirements |

## Constraints
- RTL layout for Arabic content
- Color scheme: Primary blue (#1e40af), accent gold (#f59e0b), success green (#10b981)
- Typography: Arabic-friendly fonts (Tajawal from Google Fonts)
- Maximum 8 code files for frontend
- Points system: 10 pts per lesson completion, 5-20 pts per quiz based on score