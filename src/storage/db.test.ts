import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePlan, getPlan, saveSession, getSessions, getSession,
  saveIncompleteWorkout, getIncompleteWorkout, deleteIncompleteWorkout, clearAll,
} from './db';
import type { TrainingPlan, WorkoutSession, WorkoutState } from '../types';
import 'fake-indexeddb/auto';

const samplePlan: TrainingPlan = {
  version: 1,
  planName: '测试计划',
  days: [{ id: 'a', name: 'A', blocks: [] }],
};

const sampleSession: WorkoutSession = {
  sessionId: 'test-2026-05-17T10:00:00+08:00',
  planName: '测试计划',
  planVersion: 1,
  dayId: 'a',
  dayName: 'A',
  startedAt: '2026-05-17T10:00:00+08:00',
  finishedAt: '2026-05-17T11:00:00+08:00',
  setLogs: [],
};

const sampleWorkoutState: WorkoutState = {
  session: sampleSession,
  allBlocks: [],
  currentBlockIndex: null,
  flatSets: [],
  currentFlatIndex: 0,
  remainingBlockIndices: [],
  phase: 'active',
  restStartedAt: null,
  restEndsAt: null,
  completedSetLogs: [],
  selectedExerciseIds: {},
};

describe('db', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('saves and loads plan', async () => {
    await savePlan(samplePlan);
    const loaded = await getPlan();
    expect(loaded?.planName).toBe('测试计划');
  });

  it('returns null when no plan saved', async () => {
    const plan = await getPlan();
    expect(plan).toBeNull();
  });

  it('saves and loads sessions sorted by startedAt desc', async () => {
    await saveSession(sampleSession);
    await saveSession({ ...sampleSession, sessionId: 'older', startedAt: '2026-05-16T10:00:00+08:00' });
    const sessions = await getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].sessionId).toBe('test-2026-05-17T10:00:00+08:00');
  });

  it('gets single session by id', async () => {
    await saveSession(sampleSession);
    const s = await getSession(sampleSession.sessionId);
    expect(s?.dayName).toBe('A');
    const missing = await getSession('nonexistent');
    expect(missing).toBeNull();
  });

  it('saves and loads incomplete workout', async () => {
    await saveIncompleteWorkout(sampleWorkoutState);
    const loaded = await getIncompleteWorkout();
    expect(loaded?.session.dayName).toBe('A');
  });

  it('deletes incomplete workout', async () => {
    await saveIncompleteWorkout(sampleWorkoutState);
    await deleteIncompleteWorkout();
    const loaded = await getIncompleteWorkout();
    expect(loaded).toBeNull();
  });

  it('clears all data', async () => {
    await savePlan(samplePlan);
    await saveSession(sampleSession);
    await clearAll();
    expect(await getPlan()).toBeNull();
    expect(await getSessions()).toHaveLength(0);
  });
});
