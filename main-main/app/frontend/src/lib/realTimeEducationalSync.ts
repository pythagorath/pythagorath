// Real-Time Adaptive Educational Intelligence Sprint
// Module 8: Real-Time Educational Sync Infrastructure
// State persistence, telemetry processing, reliability, consistency

import { loadUserData, saveUserData } from './pilotStorage';
import { type RealTimeSignals } from './realTimeTelemetry';
import { type RealTimeDecision } from './realTimeDecisionEngine';
import { type RealTimeMasteryState } from './realTimeMasteryTracker';

// ============ Types ============

export interface SyncState {
  studentId: string;
  sessionId: string;
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingOperations: SyncOperation[];
  syncHistory: SyncRecord[];
  config: SyncConfig;
  metrics: SyncMetrics;
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'recovering';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  data: unknown;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  priority: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export type SyncOperationType =
  | 'mastery_update'
  | 'telemetry_batch'
  | 'decision_log'
  | 'mission_progress'
  | 'misconception_alert'
  | 'session_state'
  | 'cognitive_load_snapshot';

export interface SyncRecord {
  timestamp: string;
  operationCount: number;
  success: boolean;
  durationMs: number;
  dataSize: number;
}

export interface SyncConfig {
  batchIntervalMs: number; // how often to batch sync (default 5000)
  maxBatchSize: number; // max operations per batch (default 20)
  maxRetries: number; // max retries per operation (default 3)
  retryBackoffMs: number; // base backoff time (default 1000)
  offlineQueueMax: number; // max queued operations when offline (default 100)
  compressionEnabled: boolean;
  priorityThreshold: number; // operations above this priority sync immediately
}

export interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  avgSyncTimeMs: number;
  lastError: string | null;
  offlineEvents: number;
  dataIntegrityChecks: number;
  integrityFailures: number;
}

export interface EducationalState {
  studentId: string;
  sessionId: string;
  timestamp: string;
  masteryStates: Record<string, { mastery: number; confidence: number; velocity: number }>;
  currentSignals: RealTimeSignals | null;
  recentDecisions: RealTimeDecision[];
  activeMissions: string[];
  cognitiveLoad: number;
  sessionPhase: string;
  interactionCount: number;
  version: number;
}

// ============ Constants ============

const DEFAULT_CONFIG: SyncConfig = {
  batchIntervalMs: 5000,
  maxBatchSize: 20,
  maxRetries: 3,
  retryBackoffMs: 1000,
  offlineQueueMax: 100,
  compressionEnabled: true,
  priorityThreshold: 8,
};

// ============ State ============

let syncState: SyncState | null = null;
let batchTimer: ReturnType<typeof setInterval> | null = null;
let stateVersion = 0;

// ============ Core Functions ============

export function initSync(studentId: string, sessionId: string, config?: Partial<SyncConfig>): SyncState {
  syncState = {
    studentId,
    sessionId,
    status: 'idle',
    lastSyncAt: null,
    pendingOperations: [],
    syncHistory: [],
    config: { ...DEFAULT_CONFIG, ...config },
    metrics: {
      totalSynced: 0,
      totalFailed: 0,
      avgSyncTimeMs: 0,
      lastError: null,
      offlineEvents: 0,
      dataIntegrityChecks: 0,
      integrityFailures: 0,
    },
  };

  // Start batch sync timer
  startBatchSync();

  return syncState;
}

export function queueOperation(
  type: SyncOperationType,
  data: unknown,
  priority: number = 5
): string {
  if (!syncState) return '';

  const operation: SyncOperation = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: syncState.config.maxRetries,
    priority,
    status: 'pending',
  };

  // Check queue limit
  if (syncState.pendingOperations.length >= syncState.config.offlineQueueMax) {
    // Remove lowest priority
    syncState.pendingOperations.sort((a, b) => b.priority - a.priority);
    syncState.pendingOperations.pop();
  }

  syncState.pendingOperations.push(operation);

  // Immediate sync for high priority
  if (priority >= syncState.config.priorityThreshold) {
    processBatch();
  }

  return operation.id;
}

export function saveEducationalState(
  masteryStates: Record<string, RealTimeMasteryState>,
  signals: RealTimeSignals | null,
  decisions: RealTimeDecision[],
  activeMissionIds: string[],
  cognitiveLoad: number,
  sessionPhase: string,
  interactionCount: number
): void {
  if (!syncState) return;

  stateVersion++;

  const state: EducationalState = {
    studentId: syncState.studentId,
    sessionId: syncState.sessionId,
    timestamp: new Date().toISOString(),
    masteryStates: Object.fromEntries(
      Object.entries(masteryStates).map(([key, ms]) => [
        key,
        { mastery: ms.mastery, confidence: ms.confidence, velocity: ms.velocity },
      ])
    ),
    currentSignals: signals,
    recentDecisions: decisions.slice(-5),
    activeMissions: activeMissionIds,
    cognitiveLoad,
    sessionPhase,
    interactionCount,
    version: stateVersion,
  };

  // Persist locally
  saveUserData(`edu_state_${syncState.studentId}_${syncState.sessionId}`, state);

  // Queue for remote sync
  queueOperation('session_state', state, 7);
}

export function loadEducationalState(studentId: string, sessionId: string): EducationalState | null {
  return loadUserData<EducationalState>(`edu_state_${studentId}_${sessionId}`);
}

export function getSyncState(): SyncState | null {
  return syncState;
}

export function getSyncMetrics(): SyncMetrics | null {
  return syncState?.metrics ?? null;
}

export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true;
}

export function forceSyncNow(): void {
  processBatch();
}

export function stopSync(): void {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
}

export function validateDataIntegrity(state: EducationalState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!state.studentId) errors.push('Missing studentId');
  if (!state.sessionId) errors.push('Missing sessionId');
  if (state.version < 0) errors.push('Invalid version');
  if (state.cognitiveLoad < 0 || state.cognitiveLoad > 100) errors.push('Cognitive load out of bounds');
  if (state.interactionCount < 0) errors.push('Negative interaction count');

  // Validate mastery values
  Object.entries(state.masteryStates).forEach(([skillId, ms]) => {
    if (ms.mastery < 0 || ms.mastery > 100) errors.push(`Mastery out of bounds for ${skillId}`);
    if (ms.confidence < 0 || ms.confidence > 100) errors.push(`Confidence out of bounds for ${skillId}`);
  });

  if (syncState) {
    syncState.metrics.dataIntegrityChecks++;
    if (errors.length > 0) syncState.metrics.integrityFailures++;
  }

  return { valid: errors.length === 0, errors };
}

export function getSessionHistory(studentId: string): SyncRecord[] {
  const data = loadUserData<SyncRecord[]>(`sync_history_${studentId}`);
  return data ?? [];
}

export function persistSyncHistory(): void {
  if (!syncState) return;
  const key = `sync_history_${syncState.studentId}`;
  const existing = loadUserData<SyncRecord[]>(key) ?? [];
  const combined = [...existing, ...syncState.syncHistory].slice(-50);
  saveUserData(key, combined);
}

// ============ Internal ============

function startBatchSync(): void {
  if (batchTimer) clearInterval(batchTimer);
  if (!syncState) return;

  batchTimer = setInterval(() => {
    processBatch();
  }, syncState.config.batchIntervalMs);
}

function processBatch(): void {
  if (!syncState) return;
  if (syncState.pendingOperations.length === 0) return;

  const startTime = performance.now();

  // Check online status
  if (!isOnline()) {
    syncState.status = 'offline';
    syncState.metrics.offlineEvents++;
    return;
  }

  syncState.status = 'syncing';

  // Sort by priority and take batch
  const sorted = [...syncState.pendingOperations].sort((a, b) => b.priority - a.priority);
  const batch = sorted.slice(0, syncState.config.maxBatchSize);

  // Process batch (local persistence since we don't have a real remote)
  let successCount = 0;
  let failCount = 0;

  batch.forEach(op => {
    try {
      // Persist each operation locally
      const key = `sync_op_${syncState!.studentId}_${op.type}_${op.id}`;
      saveUserData(key, op.data);
      op.status = 'completed';
      successCount++;
    } catch {
      op.retryCount++;
      if (op.retryCount >= op.maxRetries) {
        op.status = 'failed';
        failCount++;
      }
    }
  });

  // Remove completed/failed from pending
  syncState.pendingOperations = syncState.pendingOperations.filter(
    op => op.status === 'pending'
  );

  // Record sync
  const duration = performance.now() - startTime;
  const record: SyncRecord = {
    timestamp: new Date().toISOString(),
    operationCount: batch.length,
    success: failCount === 0,
    durationMs: duration,
    dataSize: JSON.stringify(batch).length,
  };

  syncState.syncHistory.push(record);
  if (syncState.syncHistory.length > 20) {
    syncState.syncHistory = syncState.syncHistory.slice(-20);
  }

  // Update metrics
  syncState.metrics.totalSynced += successCount;
  syncState.metrics.totalFailed += failCount;
  syncState.metrics.avgSyncTimeMs =
    (syncState.metrics.avgSyncTimeMs * 0.8) + (duration * 0.2);
  syncState.lastSyncAt = new Date().toISOString();
  syncState.status = 'idle';
}