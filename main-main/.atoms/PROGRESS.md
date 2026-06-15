# Requirements & Progress

## Requirements Overview
Phase 5.5: Core Adaptive & Infrastructure Hardening - Stabilize and harden the core educational intelligence layer without adding new features.

## User Stories
- Adaptive engine handles all edge cases gracefully (empty data, NaN, negative values)
- Mastery engine produces bounded, logical results with proper Bayesian updates
- Content service is resilient with retry logic, offline fallback, and consistent error handling
- Assessment intelligence validates IRT parameters and handles CAT edge cases
- Persistence layer detects offline state, queues syncs, validates data integrity
- All 10 interaction types handle errors gracefully and record results to mastery
- Error boundaries provide Arabic messages and recovery options
- Code is clean, deduplicated, lint-clean, build-clean

## Task Breakdown (Phase 1A - Infrastructure Stability) ✅ COMPLETE
- [x] Stabilize admin → student publishing: added preloadInteractions() on app init so published content reaches students immediately
- [x] Fix persistence and synchronization: added write verification, corruption detection, type validation in pilotStorage.ts
- [x] Ensure backend/frontend data consistency: entity schema alignment verified, all queries use status:'published'
- [x] Ensure educational state consistency: added validateSavedFlow() for atomic state validation, bounded xp, array guards in persist()
- [x] Ensure interaction reliability: getMissionInteractions uses absolute BUILTIN fallback, preload ensures cache populated
- [x] Fix routing stability: verified all navigation links point to valid routes, catch-all redirects to /
- [x] Lint and build verification: clean pass

## Task Breakdown (Phase 2B - Curriculum-to-Learning-Path Engine)
- [x] Create backend tables: curriculum_uploads, units, lessons, learning_objectives, skills, learning_paths, path_nodes, student_path_progress
- [x] Create LearningPathAdmin.tsx: Admin page for curriculum upload (grade/subject/semester), structure extraction, path generation, content assignment, publishing
- [x] Create StudentLearningPaths.tsx: Student view showing published paths filtered by grade subjects, with progress tracking (locked/in-progress/completed)
- [x] Add routes in App.tsx for admin and student learning path pages
- [x] Wire navigation entries in AdminDashboard and student flow
- [x] Lint and build verification

## Task Breakdown (Phase 3A - Template Inspector)
- [x] Create TemplateInspector.tsx: lightweight validation page for subject cognitive templates
- [x] Add route /admin/template-inspector in App.tsx
- [x] Add navigation entry in AdminDashboard analytics section
- [x] Add navigation button in ChildGuidedFlow header (📚 for learning flow)
- [x] Lint and build verification: clean pass

## Task Breakdown (Phase 1B - Bulk Operations & Build Fixes)
- [x] Bulk publish/unpublish UI with checkboxes in AdminCRUD table rows
- [x] Fix StudentProgressAdmin build error (pilotStorage import)
- [x] Final lint and build verification: clean pass

## Task Breakdown (Real Student Registration Flow)
- [x] Create public registration endpoint (no auth required) at /api/v1/public/register-student
- [x] Create public students list endpoint at /api/v1/public/students
- [x] Update StudentRegistration.tsx to use public endpoint instead of SDK auth
- [x] Update PilotAuthContext to support registered students (session restore + login by name)
- [x] Update PilotLogin.tsx to load and display registered students from backend
- [x] Add useEffect to fetch registered students on login page mount
- [x] Lint and build verification: clean pass

## Previous Task Breakdown (Completed Phases)
- [x] Harden personalizationEngine.ts: input validation, NaN guards, bounded outputs, safe defaults
- [x] Harden masteryEngineV2.ts: clamp Bayesian updates, validate inputs, handle empty history
- [x] Harden contentService.ts: retry logic, offline detection, cache improvements, empty state handling
- [x] Harden assessmentIntelligence.ts: validate IRT params, handle CAT edge cases, bound Newton-Raphson
- [x] Harden persistenceManager.ts: offline detection, sync queue, data integrity checks
- [x] Harden interactionService.ts: error handling for all types, validate configs, graceful fallbacks
- [x] Harden adaptiveService.ts: null checks, safe async operations, bounded state transitions
- [x] Lint and build pass
- [x] prerequisiteGating.ts: Full prerequisite graph enforcement, automatic fallback, skill graph analysis, bottleneck detection
- [x] cognitiveRemediation.ts: Structured scaffolding flow (hint→visual→worked example→guided→direct teach), remediation type detection, persistence
- [x] curriculumIntelligence.ts: Admin content→adaptive pipeline, hierarchy validation, intelligent recommendations, empty state handling
- [x] misconceptionDetector.ts: Real-time pattern recognition (off-by-one, digit swap, operation inverse, guessing, perseveration), auto-remediation trigger
- [x] cognitivePacing.ts: Load monitoring, fatigue detection, smart breaks, max 2-3 concepts/session, session phases, adaptive config by age
- [x] intelligentFeedback.ts: Graduated "why" explanations, misconception-specific feedback, visual hints, positive reinforcement calibration
- [x] skillGraphEnhanced.ts: Sub-skills, pathfinding, hanging skill detection, criticality scoring, bottleneck analysis, recommendation engine
- [x] adaptiveAssessment.ts: Adaptive question selection (max info criterion), EAP ability estimation, 3PL IRT, diagnostic mode, mastery check
- [x] syncEngine.ts: Exponential backoff with jitter, data validation, versioning, conflict resolution, batch processing, offline detection
- [x] adaptiveDecisionEngine.ts: Central decision engine aggregating all signals, priority-based decisions with reasoning, <100ms target
- [x] curriculumKnowledgeGraph.ts: Dynamic graph with prerequisite/reinforces/extends relations, BFS pathfinding, gap analysis, cluster queries
- [x] sessionIntelligence.ts: Smart session planning (warm-up→learn→practice→assess→cool-down), real-time adaptation
- [x] difficultyCalibration.ts: Personalized difficulty from actual performance, difficulty ladder (10 rungs), ZPD-based thresholds
- [x] learningStateMachine.ts: 7-state machine (NOT_STARTED→INTRODUCED→PRACTICING→DEVELOPING→PROFICIENT→MASTERED→NEEDS_REVIEW), clear transition conditions
- [x] errorIntelligence.ts: Root cause analysis (10 causes), error prediction, preventive scaffolding, pattern detection
- [x] DiceWorld module: Route added, navigation entry in ChildGuidedFlow, lint/build clean
- [x] Educational Intelligence Config: Shared types, curriculum mappings, skill graph, adaptive helpers (educationalIntelligenceConfig.ts)
- [x] Expansion Questions Management: Full CRUD with skill/curriculum mapping, cognitive types, prerequisites, remediation, mastery weight, misconceptions, performance analytics
- [x] Abacus Management Layer: Full level/exercise CRUD, progression config, skill linking, adaptive pacing, remediation paths, student performance tracking, global settings
- [x] realTimeTelemetry.ts: Live cognitive telemetry (hesitation, rush, rhythm, attention, abandonment), sliding windows, EMA smoothing, trend prediction
- [x] realTimeDecisionEngine.ts: 12 priority-based rules, cooldown management, <100ms target, action types (simplify, slow, switch, hint, rollback, remediate, challenge)
- [x] realTimeMasteryTracker.ts: Continuous Bayesian mastery updates during interaction, telemetry-weighted evidence, micro-updates, velocity tracking
- [x] misconceptionResponseEngine.ts: 14 misconception types, 5-level escalation strategies, visual switching, prerequisite revisit, guided discovery
- [x] cognitiveLoadManager.ts: Intrinsic/extraneous/germane load decomposition, age-adaptive thresholds, 10 intervention types, optimal zone tracking
- [x] adaptiveInteractionEngine.ts: Real-time scaffolding (6 levels), pacing control, visual adaptation, hint system, representation switching
- [x] adaptiveMissionEngine.ts: 8 mission templates, dynamic objective adaptation based on frustration/boredom/load, reward multipliers
- [x] realTimeEducationalSync.ts: Batch sync with priority queue, offline detection, data integrity validation, state versioning, metrics tracking

## Progress Log
- 2026-05-26: End-to-End Workflow Validation COMPLETE - Added Learning Paths navigation card to StudentDashboard (📚 مسارات التعلم) linking to /student/learning-paths. Full flow verified: Admin creates paths (LearningPathAdmin) → publishes → Student sees paths filtered by grade (StudentLearningPaths) → navigates from dashboard. Lint/build clean.
- 2026-05-25: Curriculum File Upload feature COMPLETE - Added "ملفات المنهج" tab to CurriculumManagement.tsx with full upload (by subject/grade/semester), file listing with filters, download, and delete functionality. Uses Atoms Cloud storage bucket + curriculum_files entity. Lint/build clean.
- 2026-05-25: Fixed validation errors in units/semesters/grades routers - Pydantic response schemas now match actual database model columns. Units: removed non-existent semester_id/name_ar/unit_number, added name/subject_id/display_order/status/country_id/curriculum_id. Semesters: removed semester_number/name_ar, added name/academic_year/status/country_id/curriculum_id. Grades: made all fields Optional to match nullable DB columns, added name/country_id/status. All py_compile clean, lint/build clean.
- 2026-05-25: Fixed LearningPathAdmin & StudentLearningPaths API response parsing - backend returns `{items:[...], total, skip, limit}` but frontend was treating `res.data` as array. Added `extractItems()` helper, proper error handling with user-facing messages, loading states, and success notifications. Fixed `user_id` to Optional in path_nodes and learning_paths response schemas. Lint/build clean.
- 2026-05-25: Fixed seedOmanCurriculum.ts authorization error - migrated from non-existent `client.entities.list()/create(name, data)` to correct SDK API `client.entities[name].queryAll()/create({data})`. Also fixed verifyOmanCurriculum to use correct API. Lint/build clean.
- 2026-05-25: Phase 2A SUBJECT FIX - Corrected omanCurriculumData.ts to use exact 13 agreed MVP subjects. Removed: المهارات الحياتية، تقنية المعلومات، الفنون التشكيلية، المهارات الموسيقية، الرياضة المدرسية، المهارات الفردية، اللغة الفرنسية. Added: الفيزياء (7-12)، الكيمياء (7-12)، الأحياء (7-12)، الجغرافيا (7-12)، التاريخ (7-12)، العلوم البيئية (5-12)، هذا وطني (11-12). Verified consistency across all files. Lint/build clean.
- 2026-05-25: Fixed "إنشاء المسار" button bug - LearningPathAdmin.tsx and StudentLearningPaths.tsx were using non-existent `client.from()` API. Migrated all calls to correct `client.entities['table'].create/queryAll/update/delete` SDK methods. Lint/build clean.
- 2026-05-25: Added error state display to LearningPathAdmin create form for better user feedback, lint/build clean
- 2026-05-25: Fixed LearningPathAdmin error handling - backend schemas now use Optional[int] for nullable fields (path_nodes: parent_node_id, content_config, duration_minutes; learning_paths: curriculum_upload_id, total_nodes), frontend error display properly formats FastAPI validation error arrays instead of showing [object Object]
- 2026-05-25: Phase 3A Template Inspector COMPLETE - Created TemplateInspector.tsx with subject/grade/semester selectors, 6 validation checks, cognitive patterns table, session flow display, coverage matrix, invalid combination rejection. Route /admin/template-inspector, navigation in AdminDashboard. Lint/build clean.
- 2026-05-25: Phase 1B COMPLETE - Bulk operations checkboxes in AdminCRUD table, fixed StudentProgressAdmin pilotStorage import error, lint/build clean
- 2026-05-25: Phase 1A COMPLETE - Infrastructure Stability fixes: preloadInteractions on app init, pilotStorage write verification & corruption detection, validateSavedFlow for state integrity, getMissionInteractions absolute fallback, all lint/build clean
- 2026-05-24: Phase 5.5 started - Core Adaptive & Infrastructure Hardening sprint
- 2026-05-24: Phase 5.5 COMPLETE - All hardening tasks done, lint clean, build clean
- 2026-05-24: Phase 5.5 DEEPENED - Added prerequisiteGating, cognitiveRemediation, curriculumIntelligence modules
- 2026-05-24: Phase 5.5 DEEP INTELLIGENCE - Added misconceptionDetector, cognitivePacing, intelligentFeedback, skillGraphEnhanced, adaptiveAssessment, syncEngine
- 2026-05-24: Phase 5.5 DECISION ENGINE - Added adaptiveDecisionEngine, curriculumKnowledgeGraph, sessionIntelligence, difficultyCalibration, learningStateMachine, errorIntelligence
- 2026-05-24: Admin QMS Integration - Added DiceWorld (النرد) and Abacus (المعداد) question categories to QuestionManagementSystem with category filters, sample questions, and enhanced add-question modal with skill/difficulty selectors
- 2026-05-24: Educational Intelligence Management Layers - Transformed static expansion questions and standalone Abacus into configurable adaptive educational systems managed from Admin Dashboard. Added educationalIntelligenceConfig.ts with shared types/helpers, full CRUD QuestionManagementSystem with skill-aware/curriculum-aware/adaptive-ready questions, and AbacusAdmin with level/exercise management, prerequisite graphs, remediation paths, and adaptive settings.
- 2026-05-25: Curriculum Knowledge Graph & Educational Decision Intelligence Integration - Created educationalIntelligenceHub.ts (central wiring layer connecting all 12+ intelligence modules), IntelligenceDashboard.tsx (admin page with 6 tabs: overview, students, skills, decisions, misconceptions, graph), added route /admin/intelligence, and navigation entry in AdminDashboard content tab. Lint clean, build clean.
- 2026-05-25: Assessment Intelligence & Misconception Detection Sprint - Created misconceptionTaxonomy.ts, diagnosticAssessmentEngine.ts, skillDiagnosisLayer.ts, cognitiveInteractionAnalysis.ts, assessmentStatePersistence.ts, AssessmentIntelligenceDashboard.tsx (5 tabs: misconceptions, skills, behavioral, curriculum heatmap, state). Added route /admin/assessment-intelligence and navigation in AdminDashboard analytics tab. Fixed pilotAuth import. Lint clean, build clean.
- 2026-05-25: Real-Time Adaptive Educational Intelligence Sprint COMPLETE - Created 8 new modules: realTimeTelemetry.ts (live signal collection with EMA smoothing, sliding windows), realTimeDecisionEngine.ts (12 priority-based rules, <100ms decisions), realTimeMasteryTracker.ts (continuous Bayesian mastery updates during interaction), misconceptionResponseEngine.ts (14 misconception types with 5-level escalation strategies), cognitiveLoadManager.ts (intrinsic/extraneous/germane load tracking with dynamic interventions), adaptiveInteractionEngine.ts (scaffolding, pacing, visual, hint adaptation), adaptiveMissionEngine.ts (8 mission templates that evolve dynamically), realTimeEducationalSync.ts (batch sync, offline queue, data integrity validation). Lint clean, build clean.