# Architecture Design

## System Overview
Full-stack educational platform with React frontend + Atoms Cloud backend (FastAPI + PostgreSQL).

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Backend: FastAPI (auto-generated CRUD) + PostgreSQL
- Auth: Atoms Cloud OIDC authentication
- State: React Query for server state

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Auth | Login/logout, role detection | contexts/AuthContext.tsx, lib/auth.ts |
| Student Dashboard | Subject browsing, progress display | pages/StudentDashboard.tsx |
| Quiz | Take quizzes, submit answers | pages/QuizPage.tsx |
| Admin | Manage subjects, lessons, quizzes | pages/AdminDashboard.tsx |
| Landing | Public landing page | pages/Index.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Routing | React Router | Already in template |
| API Client | @metagptx/web-sdk | Template standard |
| Styling | Tailwind + shadcn/ui | Template standard |

## File Tree Plan
```
src/
├── App.tsx (routes)
├── pages/
│   ├── Index.tsx (landing)
│   ├── StudentDashboard.tsx (student home)
│   ├── QuizPage.tsx (quiz taking)
│   └── AdminDashboard.tsx (admin panel)
├── components/
│   └── Layout.tsx (shared layout with nav)
├── contexts/
│   └── AuthContext.tsx (existing)
├── lib/
│   ├── api.ts (existing)
│   └── auth.ts (existing)
└── index.css
```

## Implementation Guide
1. Update App.tsx with new routes
2. Create Layout component with RTL support and navigation
3. Create landing page (Index.tsx)
4. Create StudentDashboard with subjects/progress/points
5. Create QuizPage for taking quizzes
6. Create AdminDashboard for content management