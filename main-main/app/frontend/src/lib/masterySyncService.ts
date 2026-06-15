// Mastery Sync Service - bridges local mastery data with backend persistence
// Syncs skill_mastery_records to/from the backend API

import { client } from './api';

export interface MasteryRecord {
  skill_id: number;
  mastery_level: number;
  confidence_score: number;
  attempts_count: number;
  correct_count: number;
  streak: number;
  status: 'new' | 'learning' | 'practicing' | 'mastered' | 'needs_review';
  last_practiced_at: string;
  mastered_at?: string;
}

const LOCAL_MASTERY_KEY = 'pythagorasMasteryData';
const SYNC_TIMESTAMP_KEY = 'pythagorasMasterySyncTime';

// Get local mastery data
export function getLocalMastery(): Record<string, MasteryRecord> {
  return JSON.parse(localStorage.getItem(LOCAL_MASTERY_KEY) || '{}');
}

// Save mastery data locally
export function saveLocalMastery(data: Record<string, MasteryRecord>): void {
  localStorage.setItem(LOCAL_MASTERY_KEY, JSON.stringify(data));
}

// Update a single skill's mastery locally
export function updateLocalSkillMastery(
  skillId: string,
  update: Partial<MasteryRecord>
): MasteryRecord {
  const all = getLocalMastery();
  const existing = all[skillId] || {
    skill_id: parseInt(skillId) || 0,
    mastery_level: 0,
    confidence_score: 0,
    attempts_count: 0,
    correct_count: 0,
    streak: 0,
    status: 'new' as const,
    last_practiced_at: new Date().toISOString(),
  };

  const updated: MasteryRecord = { ...existing, ...update, last_practiced_at: new Date().toISOString() };

  // Auto-determine status based on mastery level
  if (updated.mastery_level >= 0.9 && updated.attempts_count >= 5) {
    updated.status = 'mastered';
    if (!updated.mastered_at) updated.mastered_at = new Date().toISOString();
  } else if (updated.mastery_level >= 0.6) {
    updated.status = 'practicing';
  } else if (updated.attempts_count > 0) {
    updated.status = 'learning';
  }

  all[skillId] = updated;
  saveLocalMastery(all);
  return updated;
}

// Sync local mastery to backend (upsert)
export async function syncMasteryToBackend(): Promise<{ synced: number; failed: number }> {
  const localData = getLocalMastery();
  const entries = Object.entries(localData);
  let synced = 0;
  let failed = 0;

  for (const [, record] of entries) {
    try {
      await client.callEdgeFunction('skill-mastery-records/upsert', {
        body: {
          skill_id: record.skill_id,
          mastery_level: record.mastery_level,
          confidence_score: record.confidence_score,
          attempts_count: record.attempts_count,
          correct_count: record.correct_count,
          streak: record.streak,
          status: record.status,
          last_practiced_at: record.last_practiced_at,
          mastered_at: record.mastered_at,
        },
      });
      synced++;
    } catch {
      failed++;
    }
  }

  if (synced > 0) {
    localStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
  }

  return { synced, failed };
}

// Fetch mastery data from backend
export async function fetchMasteryFromBackend(): Promise<MasteryRecord[]> {
  try {
    const response = await client.from('skill_mastery_records').select();
    if (response && Array.isArray(response)) {
      return response as MasteryRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

// Get mastery summary from backend
export async function fetchMasterySummary(): Promise<{
  total_skills_attempted: number;
  mastered: number;
  learning: number;
  needs_review: number;
  average_mastery: number;
} | null> {
  try {
    const response = await client.callEdgeFunction('skill-mastery-records/summary/me', {
      method: 'GET',
    });
    return response as {
      total_skills_attempted: number;
      mastered: number;
      learning: number;
      needs_review: number;
      average_mastery: number;
    };
  } catch {
    return null;
  }
}

// Merge backend data with local data (backend wins on conflicts)
export function mergeWithBackend(backendRecords: MasteryRecord[]): void {
  const local = getLocalMastery();

  for (const record of backendRecords) {
    const key = String(record.skill_id);
    const localRecord = local[key];

    // Backend wins if it has more attempts or more recent practice
    if (
      !localRecord ||
      record.attempts_count > localRecord.attempts_count ||
      new Date(record.last_practiced_at) > new Date(localRecord.last_practiced_at)
    ) {
      local[key] = record;
    }
  }

  saveLocalMastery(local);
}

// Full sync cycle: fetch from backend, merge, then push local changes
export async function fullMasterySync(): Promise<void> {
  try {
    const backendRecords = await fetchMasteryFromBackend();
    if (backendRecords.length > 0) {
      mergeWithBackend(backendRecords);
    }
    await syncMasteryToBackend();
  } catch (error) {
    console.warn('Full mastery sync failed:', error);
  }
}

// Get last sync timestamp
export function getLastSyncTime(): string | null {
  return localStorage.getItem(SYNC_TIMESTAMP_KEY);
}