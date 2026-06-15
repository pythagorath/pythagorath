// Phase 5.5 Deep - Persistence & Sync Engine
// Exponential backoff, data validation, versioning, conflict resolution
// Unified sync queue for all educational data

import { loadUserData, saveUserData } from './pilotStorage';

// ============ Types ============

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
  nextRetryAt: string;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
  error: string | null;
  version: number;
  priority: SyncPriority;
}

export type SyncItemType =
  | 'mastery_update'
  | 'session_record'
  | 'assessment_result'
  | 'misconception_record'
  | 'progress_update'
  | 'retention_review'
  | 'interaction_result'
  | 'pacing_session';

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queueSize: number;
  lastSyncAt: string | null;
  lastSyncSuccess: boolean;
  consecutiveFailures: number;
  totalSynced: number;
  totalFailed: number;
  version: number;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  nextRetryMs: number | null;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized: Record<string, unknown> | null;
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ============ Configuration ============

const SYNC_QUEUE_KEY = 'pythagorasSyncQueue';
const SYNC_STATE_KEY = 'pythagorasSyncState';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_MS = 2000; // 2 seconds
const MAX_RETRY_MS = 120000; // 2 minutes
const JITTER_FACTOR = 0.3; // ±30% jitter
const BATCH_SIZE = 5; // Sync 5 items at a time
const DATA_VERSION = 1;

// ============ Core Sync Engine ============

/**
 * Add item to sync queue with validation.
 */
export function enqueueSync(
  type: SyncItemType,
  payload: Record<string, unknown>,
  priority: SyncPriority = 'normal'
): { success: boolean; error?: string } {
  // Validate payload
  const validation = validatePayload(type, payload);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.map(e => e.message).join('; ') };
  }

  const queue = loadQueue();

  // Check queue size limit
  if (queue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest low-priority completed/failed items
    const trimmed = queue
      .filter(item => item.status !== 'completed')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, MAX_QUEUE_SIZE - 1);
    saveQueue(trimmed);
  }

  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload: validation.sanitized || payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastAttemptAt: null,
    nextRetryAt: new Date().toISOString(),
    status: 'pending',
    error: null,
    version: DATA_VERSION,
    priority,
  };

  const updatedQueue = [...loadQueue(), item];
  saveQueue(updatedQueue);

  return { success: true };
}

/**
 * Process the sync queue with exponential backoff.
 * Call this periodically or when online status changes.
 */
export async function processQueue(
  syncFn: (item: SyncQueueItem) => Promise<boolean>
): Promise<SyncResult> {
  const state = loadSyncState();

  // Check if online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, itemsSynced: 0, itemsFailed: 0, errors: ['offline'], nextRetryMs: 30000 };
  }

  // Don't sync if already syncing
  if (state.isSyncing) {
    return { success: false, itemsSynced: 0, itemsFailed: 0, errors: ['already_syncing'], nextRetryMs: 5000 };
  }

  // Mark as syncing
  saveSyncState({ ...state, isSyncing: true });

  const queue = loadQueue();
  const now = new Date().toISOString();

  // Get items ready to sync (pending or retry time passed)
  const ready = queue
    .filter(item =>
      (item.status === 'pending' || item.status === 'failed') &&
      item.attempts < MAX_RETRY_ATTEMPTS &&
      item.nextRetryAt <= now
    )
    .sort((a, b) => {
      // Priority first, then creation time
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, BATCH_SIZE);

  let itemsSynced = 0;
  let itemsFailed = 0;
  const errors: string[] = [];

  for (const item of ready) {
    item.status = 'in_progress';
    item.attempts++;
    item.lastAttemptAt = new Date().toISOString();

    try {
      const success = await syncFn(item);
      if (success) {
        item.status = 'completed';
        itemsSynced++;
      } else {
        item.status = 'failed';
        item.error = 'sync_returned_false';
        item.nextRetryAt = calculateNextRetry(item.attempts);
        itemsFailed++;
        errors.push(`Failed: ${item.type} (${item.id})`);
      }
    } catch (err) {
      item.status = 'failed';
      item.error = err instanceof Error ? err.message : 'unknown_error';
      item.nextRetryAt = calculateNextRetry(item.attempts);
      itemsFailed++;
      errors.push(`Error: ${item.type} - ${item.error}`);
    }
  }

  // Update queue (remove completed items older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const updatedQueue = queue.filter(item =>
    item.status !== 'completed' || item.lastAttemptAt! > oneHourAgo
  );
  saveQueue(updatedQueue);

  // Update state
  const newState: SyncState = {
    isOnline: true,
    isSyncing: false,
    queueSize: updatedQueue.filter(i => i.status !== 'completed').length,
    lastSyncAt: new Date().toISOString(),
    lastSyncSuccess: itemsFailed === 0 && itemsSynced > 0,
    consecutiveFailures: itemsFailed > 0 ? state.consecutiveFailures + 1 : 0,
    totalSynced: state.totalSynced + itemsSynced,
    totalFailed: state.totalFailed + itemsFailed,
    version: DATA_VERSION,
  };
  saveSyncState(newState);

  // Calculate next retry time
  const pendingItems = updatedQueue.filter(i => i.status === 'pending' || i.status === 'failed');
  const nextRetryMs = pendingItems.length > 0
    ? Math.max(BASE_RETRY_MS, calculateBackoff(newState.consecutiveFailures))
    : null;

  return { success: itemsFailed === 0, itemsSynced, itemsFailed, errors, nextRetryMs };
}

// ============ Exponential Backoff ============

function calculateNextRetry(attempts: number): string {
  const backoffMs = calculateBackoff(attempts);
  return new Date(Date.now() + backoffMs).toISOString();
}

function calculateBackoff(attempts: number): number {
  // Exponential backoff with jitter
  const exponential = BASE_RETRY_MS * Math.pow(2, Math.min(attempts, 7));
  const capped = Math.min(exponential, MAX_RETRY_MS);

  // Add jitter to prevent thundering herd
  const jitter = capped * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.max(BASE_RETRY_MS, Math.round(capped + jitter));
}

// ============ Data Validation ============

function validatePayload(type: SyncItemType, payload: Record<string, unknown>): DataValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const sanitized = { ...payload };

  // Common validations
  if (payload.user_id && typeof payload.user_id !== 'string') {
    errors.push({ field: 'user_id', message: 'user_id must be a string', value: payload.user_id });
  }

  // Type-specific validations
  switch (type) {
    case 'mastery_update':
      validateMasteryPayload(payload, errors, warnings, sanitized);
      break;
    case 'session_record':
      validateSessionPayload(payload, errors, warnings, sanitized);
      break;
    case 'assessment_result':
      validateAssessmentPayload(payload, errors, warnings, sanitized);
      break;
    default:
      // Basic validation for other types
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized: errors.length === 0 ? sanitized : null,
  };
}

function validateMasteryPayload(
  payload: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  sanitized: Record<string, unknown>
): void {
  const masteryLevel = Number(payload.mastery_level);
  if (!Number.isFinite(masteryLevel) || masteryLevel < 0 || masteryLevel > 1) {
    if (Number.isFinite(masteryLevel)) {
      sanitized.mastery_level = Math.max(0, Math.min(1, masteryLevel));
      warnings.push({ field: 'mastery_level', message: 'Clamped to [0,1]' });
    } else {
      errors.push({ field: 'mastery_level', message: 'Must be number 0-1', value: payload.mastery_level });
    }
  }

  const attempts = Number(payload.attempts_count);
  if (!Number.isFinite(attempts) || attempts < 0) {
    errors.push({ field: 'attempts_count', message: 'Must be non-negative integer', value: payload.attempts_count });
  }
}

function validateSessionPayload(
  payload: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  sanitized: Record<string, unknown>
): void {
  const duration = Number(payload.duration_seconds);
  if (!Number.isFinite(duration) || duration < 0) {
    sanitized.duration_seconds = 0;
    warnings.push({ field: 'duration_seconds', message: 'Invalid duration, set to 0' });
  } else if (duration > 7200) {
    sanitized.duration_seconds = 7200;
    warnings.push({ field: 'duration_seconds', message: 'Capped at 2 hours' });
  }

  const questionsAttempted = Number(payload.questions_attempted);
  if (!Number.isFinite(questionsAttempted) || questionsAttempted < 0) {
    sanitized.questions_attempted = 0;
    warnings.push({ field: 'questions_attempted', message: 'Invalid, set to 0' });
  }
}

function validateAssessmentPayload(
  payload: Record<string, unknown>,
  errors: ValidationError[],
  _warnings: ValidationWarning[],
  _sanitized: Record<string, unknown>
): void {
  if (!payload.session_id || typeof payload.session_id !== 'string') {
    errors.push({ field: 'session_id', message: 'Required string', value: payload.session_id });
  }
  const ability = Number(payload.ability_estimate);
  if (!Number.isFinite(ability) || ability < -4 || ability > 4) {
    errors.push({ field: 'ability_estimate', message: 'Must be number in [-4, 4]', value: payload.ability_estimate });
  }
}

// ============ Versioning ============

/**
 * Check if local data version matches expected version.
 * If not, trigger migration.
 */
export function checkDataVersion(): { needsMigration: boolean; currentVersion: number; expectedVersion: number } {
  const state = loadSyncState();
  return {
    needsMigration: state.version < DATA_VERSION,
    currentVersion: state.version,
    expectedVersion: DATA_VERSION,
  };
}

/**
 * Migrate data from old version to new version.
 */
export function migrateData(fromVersion: number): boolean {
  try {
    // Version 0 → 1: Add version field to all stored data
    if (fromVersion < 1) {
      const state = loadSyncState();
      state.version = 1;
      saveSyncState(state);
    }

    // Future migrations go here
    // if (fromVersion < 2) { ... }

    return true;
  } catch {
    return false;
  }
}

// ============ Online/Offline Detection ============

/**
 * Setup online/offline listeners and trigger sync when online.
 */
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    const state = loadSyncState();
    saveSyncState({ ...state, isOnline: true });
    onOnline();
  };

  const handleOffline = () => {
    const state = loadSyncState();
    saveSyncState({ ...state, isOnline: false, isSyncing: false });
    onOffline();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  return () => {};
}

// ============ Queue Status ============

export function getQueueStatus(): {
  pending: number;
  failed: number;
  completed: number;
  total: number;
  oldestPending: string | null;
  nextRetryAt: string | null;
} {
  const queue = loadQueue();
  const pending = queue.filter(i => i.status === 'pending').length;
  const failed = queue.filter(i => i.status === 'failed').length;
  const completed = queue.filter(i => i.status === 'completed').length;

  const pendingItems = queue.filter(i => i.status === 'pending' || i.status === 'failed');
  const oldestPending = pendingItems.length > 0
    ? pendingItems.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].createdAt
    : null;

  const nextRetry = pendingItems
    .filter(i => i.status === 'failed')
    .sort((a, b) => a.nextRetryAt.localeCompare(b.nextRetryAt))[0]?.nextRetryAt || null;

  return { pending, failed, completed, total: queue.length, oldestPending, nextRetryAt: nextRetry };
}

// ============ Storage Helpers ============

function loadQueue(): SyncQueueItem[] {
  return loadUserData<SyncQueueItem[]>(SYNC_QUEUE_KEY, []);
}

function saveQueue(queue: SyncQueueItem[]): void {
  saveUserData(SYNC_QUEUE_KEY, queue);
}

function loadSyncState(): SyncState {
  return loadUserData<SyncState>(SYNC_STATE_KEY, {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    queueSize: 0,
    lastSyncAt: null,
    lastSyncSuccess: true,
    consecutiveFailures: 0,
    totalSynced: 0,
    totalFailed: 0,
    version: DATA_VERSION,
  });
}

function saveSyncState(state: SyncState): void {
  saveUserData(SYNC_STATE_KEY, state);
}