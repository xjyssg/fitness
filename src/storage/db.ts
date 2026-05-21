import { openDB, type IDBPDatabase } from 'idb';
import type { TrainingPlan, WorkoutSession, WorkoutState } from '../types';

const DB_NAME = 'training-assistant';
const DB_VERSION = 1;

function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'sessionId' });
        store.createIndex('startedAt', 'startedAt');
      }
      if (!db.objectStoreNames.contains('incompleteWorkout')) {
        db.createObjectStore('incompleteWorkout');
      }
    },
  });
}

const PLAN_KEY = 'currentPlan';
const INCOMPLETE_KEY = 'state';

export async function savePlan(plan: TrainingPlan): Promise<void> {
  const db = await getDb();
  await db.put('meta', plan, PLAN_KEY);
}

export async function getPlan(): Promise<TrainingPlan | null> {
  const db = await getDb();
  const plan = await db.get('meta', PLAN_KEY);
  return plan ?? null;
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  const db = await getDb();
  await db.put('sessions', session);
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const db = await getDb();
  const sessions = await db.getAll('sessions');
  sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return sessions;
}

export async function getSession(sessionId: string): Promise<WorkoutSession | null> {
  const db = await getDb();
  const session = await db.get('sessions', sessionId);
  return session ?? null;
}

export async function saveIncompleteWorkout(state: WorkoutState): Promise<void> {
  const db = await getDb();
  await db.put('incompleteWorkout', state, INCOMPLETE_KEY);
}

export async function getIncompleteWorkout(): Promise<WorkoutState | null> {
  const db = await getDb();
  const state = await db.get('incompleteWorkout', INCOMPLETE_KEY);
  return state ?? null;
}

export async function deleteIncompleteWorkout(): Promise<void> {
  const db = await getDb();
  await db.delete('incompleteWorkout', INCOMPLETE_KEY);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.delete('sessions', sessionId);
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear('meta');
  await db.clear('sessions');
  await db.clear('incompleteWorkout');
}
