/**
 * API client — talks ONLY to the live backend endpoints. No static data.
 * Base URL is configurable via VITE_API_BASE (defaults to the dev backend).
 */
import axios from 'axios';

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  'http://localhost:8000/api';

export const api = axios.create({ baseURL: API_BASE });

/** Public URL the child UI / admin uses to stream a question's recorded audio. */
export function questionAudioUrl(questionId: number): string {
  return `${API_BASE}/questions/${questionId}/audio`;
}

export async function uploadQuestionAudio(questionId: number, blob: Blob): Promise<void> {
  const form = new FormData();
  form.append('file', blob, `q${questionId}.webm`);
  await api.post(`/admin/questions/${questionId}/audio`, form);
}

export async function deleteQuestionAudio(questionId: number): Promise<void> {
  await api.delete(`/admin/questions/${questionId}/audio`);
}

export interface Student {
  id: number;
  name: string;
  grade_id: number;
  country_id: number;
}

export interface Subject {
  id: number;
  grade_id: number;
  name: string;
}

export async function getStudents(): Promise<Student[]> {
  const { data } = await api.get<Student[]>('/students');
  return data;
}

export async function getSubjects(gradeId: number): Promise<Subject[]> {
  const { data } = await api.get<Subject[]>(`/grades/${gradeId}/subjects`);
  return data;
}

// ----- questions / answering -----
export interface QuestionPayload {
  prompt?: string;
  answer?: string;
  visual?: { type: string; data: Record<string, unknown> };
  choices?: string[];
  // interactive number-line config (min/max/step) — answer comes from placement
  line?: { min: number; max: number; step: number };
  // skip-count config — child counts by groups (groups × per_group)
  count?: { emoji: string; groups: number; per_group: number };
  // fill config — child types the answer on an on-screen Hindi keypad
  fill?: { max_digits?: number };
}

export interface Question {
  id: number;
  skill_id: number;
  interaction_type: string;
  difficulty: number;
  payload: QuestionPayload;
}

export interface DiagnosticResponse {
  student_id: number;
  subject_id: number;
  count: number;
  questions: Question[];
}

export interface SubmitAnswerResponse {
  answer_log_id: number;
  is_correct: boolean;
  skill_id: number;
  mastery_level: number;
  attempts: number;
  status: string;
  next_question: Question | null;
}

export async function getAdminQuestions(): Promise<Question[]> {
  const { data } = await api.get<Question[]>('/admin/questions');
  return data;
}

export interface AdminSkill {
  id: number;
  name: string;
  order: number;
  unit_id: number;
  mastery_threshold: number;
}

export async function getAdminSkills(): Promise<AdminSkill[]> {
  const { data } = await api.get<AdminSkill[]>('/admin/skills');
  return data;
}

export async function getRecordedAudioIds(): Promise<number[]> {
  const { data } = await api.get<{ recorded_ids: number[] }>('/admin/audio/recorded');
  return data.recorded_ids;
}

// ----- admin hierarchy + question CRUD (uses existing endpoints) -----
export interface AdminGrade { id: number; name: string; curriculum_id: number; order: number }
export interface AdminSubject { id: number; name: string; grade_id: number }
export interface AdminUnit { id: number; name: string; subject_id: number; order: number }

export async function getAdminGrades(): Promise<AdminGrade[]> {
  return (await api.get<AdminGrade[]>('/admin/grades')).data;
}
export async function getAdminSubjects(): Promise<AdminSubject[]> {
  return (await api.get<AdminSubject[]>('/admin/subjects')).data;
}
export async function getAdminUnits(): Promise<AdminUnit[]> {
  return (await api.get<AdminUnit[]>('/admin/units')).data;
}

export interface QuestionInput {
  skill_id: number;
  interaction_type: string;
  difficulty: number;
  payload: QuestionPayload;
}

export async function createQuestion(body: QuestionInput): Promise<Question> {
  return (await api.post<Question>('/admin/questions', body)).data;
}
export async function patchAdminQuestion(id: number, body: Partial<QuestionInput>): Promise<Question> {
  return (await api.patch<Question>(`/admin/questions/${id}`, body)).data;
}
export async function deleteAdminQuestion(id: number): Promise<void> {
  await api.delete(`/admin/questions/${id}`);
}

export async function getDiagnostic(
  studentId: number,
  subjectId: number,
): Promise<DiagnosticResponse> {
  const { data } = await api.get<DiagnosticResponse>('/diagnostic', {
    params: { student_id: studentId, subject_id: subjectId },
  });
  return data;
}

// ----- adaptive start-point placement (§2) -----
export interface PlacementResult {
  placement_skill_id: number;
  placement_skill_name: string;
  landing_order: number;
  placed_out: { skill_id: number; name: string }[];
}

export interface PlacementStatus {
  placed: boolean;
  current_position: number | null;
  placement_skill_id: number | null;
}

/** Has this child been placed in this subject yet? (Drives first-session-only diagnostic.) */
export async function getPlacementStatus(
  studentId: number,
  subjectId: number,
): Promise<PlacementStatus> {
  const { data } = await api.get<PlacementStatus>(
    `/students/${studentId}/subjects/${subjectId}/placement`,
  );
  return data;
}

/** Submit the diagnostic answers; returns where the child is placed to start. */
export async function submitDiagnosticPlacement(
  studentId: number,
  subjectId: number,
  answers: { question_id: number; answer: string }[],
): Promise<PlacementResult> {
  const { data } = await api.post<PlacementResult>('/diagnostic/placement', {
    student_id: studentId,
    subject_id: subjectId,
    answers,
  });
  return data;
}

/** Clear a placement so the child can be re-diagnosed (never irreversible). */
export async function deletePlacement(studentId: number): Promise<void> {
  await api.delete(`/students/${studentId}/placement`);
}

export async function submitAnswer(
  studentId: number,
  questionId: number,
  answer: string,
): Promise<SubmitAnswerResponse> {
  const { data } = await api.post<SubmitAnswerResponse>('/submit_answer', {
    student_id: studentId,
    question_id: questionId,
    answer,
  });
  return data;
}

// ----- skill map (§3.3) -----
export interface SkillPrereq {
  skill_id: number;
  name: string;
  mastered: boolean;
}

export interface SkillMapEntry {
  skill_id: number;
  name: string;
  order: number;
  status: 'mastered' | 'available' | 'locked';
  prerequisites: SkillPrereq[];
}

export interface SkillMapResponse {
  student_id: number;
  subject_id: number;
  skills: SkillMapEntry[];
}

/** Every skill of the subject with its mastered/available/locked state. */
export async function getSkillMap(
  studentId: number,
  subjectId: number,
): Promise<SkillMapEntry[]> {
  const { data } = await api.get<SkillMapResponse>(
    `/students/${studentId}/subjects/${subjectId}/skillmap`,
  );
  return data.skills;
}

/** Questions to start a session on ONE skill. Rejects (403) if the skill is locked. */
export async function getSkillQuestions(
  studentId: number,
  skillId: number,
): Promise<Question[]> {
  const { data } = await api.get<{ skill_id: number; count: number; questions: Question[] }>(
    `/students/${studentId}/skills/${skillId}/questions`,
  );
  return data.questions;
}

// ----- parent-facing progress -----
export interface SkillProgress {
  skill_id: number;
  name: string;
  status: string;
  mastery_level: number;
  light: 'green' | 'yellow' | 'gray';
}

export interface ProgressResponse {
  student_id: number;
  student_name: string;
  summary: string;
  overall_light: 'green' | 'yellow' | 'gray';
  skills: SkillProgress[];
}

export async function getProgress(studentId: number): Promise<ProgressResponse> {
  const { data } = await api.get<ProgressResponse>(`/students/${studentId}/progress`);
  return data;
}

// ----- parent (mother) report (§3.4) — human-language, structured -----
export interface ParentSkill {
  skill_id: number;
  name: string;
  status: 'mastered' | 'in_progress' | 'not_started';
  light: 'green' | 'yellow' | 'gray';
}

export interface ParentUnit {
  unit_name: string;
  total_skills: number;
  mastered_skills: number;
}

export interface ParentSupport {
  skill_id: number;
  name: string;
  attempts: number;
}

export interface ParentReport {
  student_id: number;
  student_name: string;
  grade_name: string;
  overall_light: 'green' | 'yellow' | 'gray';
  unit: ParentUnit;
  skills: ParentSkill[];
  mastered_names: string[];
  curriculum_on_track: boolean;
  support: ParentSupport | null;
}

export async function getParentReport(studentId: number): Promise<ParentReport> {
  const { data } = await api.get<ParentReport>(`/students/${studentId}/report`);
  return data;
}
