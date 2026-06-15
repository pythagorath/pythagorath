// Pilot Accounts - Extended role-based system for complete product
// Roles: student, parent, admin, reviewer, content_manager

export type PilotRole = 'student' | 'parent' | 'admin' | 'reviewer' | 'content_manager';

export interface PilotAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: PilotRole;
  grade?: number;
  linkedStudents?: string[];
}

// Demo accounts for controlled pilot
export const PILOT_ACCOUNTS: PilotAccount[] = [
  // Students
  { id: 'student1', username: 'student1', password: '1234', name: 'أحمد', role: 'student', grade: 1 },
  { id: 'student2', username: 'student2', password: '1234', name: 'سارة', role: 'student', grade: 1 },
  { id: 'student3', username: 'student3', password: '1234', name: 'محمد', role: 'student', grade: 2 },
  { id: 'student4', username: 'student4', password: '1234', name: 'فاطمة', role: 'student', grade: 2 },
  { id: 'student5', username: 'student5', password: '1234', name: 'عمر', role: 'student', grade: 1 },
  { id: 'student6', username: 'student6', password: '1234', name: 'نور', role: 'student', grade: 1 },
  { id: 'student7', username: 'student7', password: '1234', name: 'يوسف', role: 'student', grade: 2 },
  { id: 'student8', username: 'student8', password: '1234', name: 'مريم', role: 'student', grade: 2 },
  { id: 'student9', username: 'student9', password: '1234', name: 'خالد', role: 'student', grade: 1 },
  { id: 'student10', username: 'student10', password: '1234', name: 'ليلى', role: 'student', grade: 2 },
  // Parents
  { id: 'parent1', username: 'parent1', password: '1234', name: 'أبو أحمد', role: 'parent', linkedStudents: ['student1', 'student2'] },
  { id: 'parent2', username: 'parent2', password: '1234', name: 'أم محمد', role: 'parent', linkedStudents: ['student3', 'student4'] },
  { id: 'parent3', username: 'parent3', password: '1234', name: 'أبو عمر', role: 'parent', linkedStudents: ['student5', 'student6'] },
  { id: 'parent4', username: 'parent4', password: '1234', name: 'أم يوسف', role: 'parent', linkedStudents: ['student7', 'student8'] },
  { id: 'parent5', username: 'parent5', password: '1234', name: 'أبو خالد', role: 'parent', linkedStudents: ['student9', 'student10'] },
  // Admin
  { id: 'admin1', username: 'admin', password: 'admin123', name: 'المدير', role: 'admin' },
  // Academic Reviewer
  { id: 'reviewer1', username: 'reviewer1', password: '1234', name: 'د. سعاد', role: 'reviewer' },
  { id: 'reviewer2', username: 'reviewer2', password: '1234', name: 'أ. فهد', role: 'reviewer' },
  // Content Manager
  { id: 'content1', username: 'content1', password: '1234', name: 'منى', role: 'content_manager' },
  { id: 'content2', username: 'content2', password: '1234', name: 'عبدالله', role: 'content_manager' },
];

export function authenticatePilot(username: string, password: string): PilotAccount | null {
  const account = PILOT_ACCOUNTS.find(
    (a) => a.username === username && a.password === password
  );
  return account || null;
}

export function getAccountById(id: string): PilotAccount | undefined {
  return PILOT_ACCOUNTS.find((a) => a.id === id);
}

export function getStudentAccounts(): PilotAccount[] {
  return PILOT_ACCOUNTS.filter((a) => a.role === 'student');
}

export function getParentAccounts(): PilotAccount[] {
  return PILOT_ACCOUNTS.filter((a) => a.role === 'parent');
}

export function getLinkedStudents(parentId: string): PilotAccount[] {
  const parent = PILOT_ACCOUNTS.find((a) => a.id === parentId);
  if (!parent?.linkedStudents) return [];
  return PILOT_ACCOUNTS.filter((a) => parent.linkedStudents!.includes(a.id));
}

export function getStudentParent(studentId: string): PilotAccount | undefined {
  return PILOT_ACCOUNTS.find(
    (a) => a.role === 'parent' && a.linkedStudents?.includes(studentId)
  );
}

export function getRoleLabel(role: PilotRole): string {
  const labels: Record<PilotRole, string> = {
    student: 'طالب',
    parent: 'ولي أمر',
    admin: 'مدير النظام',
    reviewer: 'مراجع أكاديمي',
    content_manager: 'مدير المحتوى',
  };
  return labels[role];
}

export function getRoleDashboardPath(role: PilotRole): string {
  const paths: Record<PilotRole, string> = {
    student: '/student',
    parent: '/parent',
    admin: '/admin',
    reviewer: '/reviewer',
    content_manager: '/content',
  };
  return paths[role];
}