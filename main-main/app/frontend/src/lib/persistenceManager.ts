// Persistence Manager - Reliable localStorage wrapper with recovery & validation
// Handles: save failures, data corruption, version migration, auto-backup

const BACKUP_SUFFIX = '_backup';
const VERSION_KEY = 'pythagoras_data_version';
const CURRENT_VERSION = 2;
const SYNC_QUEUE_KEY = 'pythagoras_sync_queue';
const MAX_SYNC_QUEUE = 50;
const MONITOR_KEY = 'pythagoras_monitor_log';

export interface PersistenceResult {
  success: boolean;
  error?: string;
  recovered?: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'mastery' | 'session' | 'progress' | 'retention';
  data: unknown;
  timestamp: string;
  retries: number;
}

/** Check if the browser is online */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Check if localStorage is available and functional */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage write with backup and validation
 */
export function safeSave(key: string, data: unknown): PersistenceResult {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage not available' };
  }
  try {
    const serialized = JSON.stringify(data);

    // Validate serialization roundtrip - catch circular references
    JSON.parse(serialized);

    // Size check - warn if single item > 1MB
    if (serialized.length > 1024 * 1024) {
      monitorEvent('large_save', { key, sizeBytes: serialized.length });
    }

    // Create backup of existing data before overwriting
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        localStorage.setItem(key + BACKUP_SUFFIX, existing);
      } catch {
        // If backup fails due to quota, remove old backups
        clearOldBackups();
      }
    }

    localStorage.setItem(key, serialized);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown save error';

    // If quota exceeded, try clearing old data
    if (msg.includes('QuotaExceeded') || msg.includes('quota') || msg.includes('QUOTA')) {
      clearOldBackups();
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
      } catch {
        // Still failing - try removing monitor log as last resort
        try {
          localStorage.removeItem(MONITOR_KEY);
          localStorage.setItem(key, JSON.stringify(data));
          return { success: true };
        } catch {
          // Truly out of space
        }
      }
    }

    monitorEvent('save_failure', { key, error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Safe localStorage read with fallback to backup
 */
export function safeLoad<T>(key: string, defaultValue: T): { data: T; recovered: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      return { data: parsed, recovered: false };
    }
  } catch {
    // Primary data corrupted, try backup
    monitorEvent('data_corruption', { key });
    try {
      const backup = localStorage.getItem(key + BACKUP_SUFFIX);
      if (backup) {
        const parsed = JSON.parse(backup) as T;
        // Restore from backup
        localStorage.setItem(key, backup);
        monitorEvent('data_recovered', { key, source: 'backup' });
        return { data: parsed, recovered: true };
      }
    } catch {
      // Backup also corrupted
      monitorEvent('backup_corruption', { key });
    }
  }

  return { data: defaultValue, recovered: false };
}

/**
 * Validate data integrity for student progress
 */
export function validateProgressData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  // Must have expected fields
  if (typeof obj.totalPoints !== 'number' || !Number.isFinite(obj.totalPoints)) return false;
  if (!Array.isArray(obj.completedLessons)) return false;
  if (!Array.isArray(obj.quizResults)) return false;

  // Points should be non-negative and bounded
  if (obj.totalPoints < 0 || obj.totalPoints > 1000000) return false;

  // Validate array sizes are reasonable
  if (obj.completedLessons.length > 10000) return false;
  if (obj.quizResults.length > 10000) return false;

  return true;
}

/**
 * Validate mastery data integrity
 */
export function validateMasteryData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  if (Array.isArray(data)) {
    // Reject unreasonably large arrays
    if (data.length > 5000) return false;
    return data.every(item => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      if (typeof record.skillId !== 'string' || !record.skillId) return false;
      if (typeof record.attempts !== 'number' || !Number.isFinite(record.attempts)) return false;
      if (record.attempts < 0) return false;
      // If correctCount exists, it must be <= attempts
      if (typeof record.correctCount === 'number') {
        if (!Number.isFinite(record.correctCount) || record.correctCount < 0) return false;
        if (record.correctCount > record.attempts) return false;
      }
      return true;
    });
  }
  return true;
}

/**
 * Clear old backups to free space
 */
function clearOldBackups(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.endsWith(BACKUP_SUFFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/**
 * Data version migration
 */
export function migrateDataIfNeeded(): void {
  const version = parseInt(localStorage.getItem(VERSION_KEY) || '1');
  if (version >= CURRENT_VERSION) return;

  // Migration from v1 to v2: ensure all progress arrays exist
  if (version < 2) {
    const raw = localStorage.getItem('student_progress');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (!data.weeklyActivity) data.weeklyActivity = {};
        if (!data.lessonsProgress) data.lessonsProgress = [];
        if (!data.totalStudyMinutes) data.totalStudyMinutes = 0;
        localStorage.setItem('student_progress', JSON.stringify(data));
      } catch {
        // Skip migration if data is corrupted
      }
    }
  }

  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
}

// ===== Runtime Monitoring =====

export interface MonitorEvent {
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
}

const MAX_MONITOR_EVENTS = 100;

/**
 * Log a monitoring event
 */
export function monitorEvent(type: string, details: Record<string, unknown> = {}): void {
  try {
    const events: MonitorEvent[] = JSON.parse(localStorage.getItem(MONITOR_KEY) || '[]');
    events.push({
      type,
      timestamp: new Date().toISOString(),
      details,
    });

    // Keep only recent events
    const trimmed = events.slice(-MAX_MONITOR_EVENTS);
    localStorage.setItem(MONITOR_KEY, JSON.stringify(trimmed));
  } catch {
    // If monitoring itself fails, silently ignore
  }
}

/**
 * Get all monitor events
 */
export function getMonitorEvents(): MonitorEvent[] {
  try {
    return JSON.parse(localStorage.getItem(MONITOR_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Track session health
 */
export function trackSessionHealth(metrics: {
  loadTimeMs: number;
  questionsAnswered: number;
  errorsEncountered: number;
  sessionDurationMs: number;
}): void {
  if (metrics.loadTimeMs > 5000) {
    monitorEvent('slow_load', { loadTimeMs: metrics.loadTimeMs });
  }
  if (metrics.errorsEncountered > 0) {
    monitorEvent('session_errors', {
      count: metrics.errorsEncountered,
      duration: metrics.sessionDurationMs,
    });
  }
  if (metrics.questionsAnswered === 0 && metrics.sessionDurationMs > 30000) {
    monitorEvent('mission_abandonment', {
      duration: metrics.sessionDurationMs,
    });
  }
}

/**
 * Detect unexpected mastery jumps
 */
export function detectMasteryAnomaly(
  skillId: string,
  previousMastery: number,
  newMastery: number
): boolean {
  const jump = Math.abs(newMastery - previousMastery);
  if (jump > 40) {
    monitorEvent('unexpected_mastery_jump', {
      skillId,
      previousMastery,
      newMastery,
      jump,
    });
    return true;
  }
  return false;
}

/**
 * Track retry loops (user retrying same action multiple times)
 */
const retryCounters: Record<string, { count: number; firstAttempt: number }> = {};

export function trackRetry(actionKey: string): boolean {
  const now = Date.now();
  const entry = retryCounters[actionKey];

  if (!entry || now - entry.firstAttempt > 60000) {
    // Reset after 1 minute
    retryCounters[actionKey] = { count: 1, firstAttempt: now };
    return false;
  }

  entry.count++;
  if (entry.count >= 5) {
    monitorEvent('retry_loop', { actionKey, count: entry.count });
    retryCounters[actionKey] = { count: 0, firstAttempt: now };
    return true;
  }
  return false;
}

// ===== Offline Sync Queue =====

/**
 * Add an item to the sync queue (for when offline)
 */
export function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void {
  if (!isStorageAvailable()) return;
  try {
    const queue = getSyncQueue();
    queue.push({
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
    // Keep queue bounded
    const trimmed = queue.slice(-MAX_SYNC_QUEUE);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail - queue is best-effort
  }
}

/**
 * Get pending sync queue items
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Remove processed items from sync queue
 */
export function removeSyncQueueItems(ids: string[]): void {
  if (!isStorageAvailable()) return;
  try {
    const queue = getSyncQueue().filter(item => !ids.includes(item.id));
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Silent fail
  }
}

/**
 * Mark a sync queue item as retried
 */
export function incrementSyncRetry(id: string): void {
  try {
    const queue = getSyncQueue();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.retries++;
      // Remove items that have been retried too many times
      const filtered = queue.filter(i => i.retries < 5);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    }
  } catch {
    // Silent fail
  }
}

/**
 * Get storage usage info
 */
export function getStorageUsage(): { usedKB: number; itemCount: number } {
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += (localStorage.getItem(key) || '').length;
      }
    }
    return { usedKB: Math.round(totalSize / 1024), itemCount: localStorage.length };
  } catch {
    return { usedKB: 0, itemCount: 0 };
  }
}

// Initialize on load
migrateDataIfNeeded();