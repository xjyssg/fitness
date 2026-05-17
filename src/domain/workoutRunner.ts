import type {
  TrainingDay, TrainingPlan, WorkoutSession, WorkoutState,
  FlatSet, SetLog, WorkoutPhase,
} from '../types';

export const SET_KIND_LABELS: Record<string, string> = {
  top: '顶组',
  backoff: '降重组',
  working: '正式组',
  accessory: '辅助组',
  cardio: '有氧',
};

function generateSessionId(dayId: string): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const mins = String(Math.abs(offset) % 60).padStart(2, '0');
  const tz = `${sign}${hours}:${mins}`;
  const iso = now.toISOString().replace(/\.\d+Z$/, '');
  return `${dayId}-${iso}${tz}`;
}

export function flattenSets(day: TrainingDay): FlatSet[] {
  const result: FlatSet[] = [];
  for (let bi = 0; bi < day.blocks.length; bi++) {
    const block = day.blocks[bi];
    for (let si = 0; si < block.sets.length; si++) {
      result.push({ blockIndex: bi, setIndex: si, block, set: block.sets[si] });
    }
  }
  return result;
}

export function startWorkout(plan: TrainingPlan, day: TrainingDay): WorkoutState {
  const sessionId = generateSessionId(day.id);
  const session: WorkoutSession = {
    sessionId,
    planName: plan.planName,
    planVersion: plan.version,
    dayId: day.id,
    dayName: day.name,
    focus: day.focus,
    startedAt: new Date().toISOString(),
  };
  const flatSets = flattenSets(day);

  return {
    session,
    flatSets,
    currentFlatIndex: 0,
    phase: 'active' as WorkoutPhase,
    restStartedAt: null,
    restEndsAt: null,
    completedSetLogs: [],
  };
}

export function completeSet(state: WorkoutState, actualReps: number): WorkoutState {
  const current = state.flatSets[state.currentFlatIndex];
  const now = new Date();

  const setLog: SetLog = {
    sessionId: state.session.sessionId,
    dayId: state.session.dayId,
    dayName: state.session.dayName,
    exerciseId: current.block.exerciseId,
    exerciseName: current.block.name,
    setIndex: current.setIndex + 1,
    setKind: current.set.kind,
    plannedWeight: current.set.plannedWeight,
    targetReps: current.set.targetReps,
    actualReps,
    plannedRestSeconds: current.set.restSeconds,
    actualRestSeconds: 0,
    completedAt: now.toISOString(),
  };

  const isLastSet = state.currentFlatIndex >= state.flatSets.length - 1;
  const completedSetLogs = [...state.completedSetLogs, setLog];

  if (isLastSet) {
    const session: WorkoutSession = {
      ...state.session,
      finishedAt: now.toISOString(),
      setLogs: completedSetLogs,
    };
    return {
      ...state,
      session,
      phase: 'completed',
      restStartedAt: null,
      restEndsAt: null,
      completedSetLogs,
    };
  }

  const restSeconds = current.set.restSeconds;
  const restStartedAt = now.toISOString();
  const restEndsAt = new Date(now.getTime() + restSeconds * 1000).toISOString();

  return {
    ...state,
    phase: 'rest',
    restStartedAt,
    restEndsAt,
    completedSetLogs,
  };
}

export function startNextSet(state: WorkoutState): WorkoutState {
  if (state.phase !== 'rest') return state;

  const now = new Date();
  const restStartedAt = state.restStartedAt ? new Date(state.restStartedAt) : now;
  const actualRestMs = now.getTime() - restStartedAt.getTime();
  const actualRestSeconds = Math.round(actualRestMs / 1000);

  const updatedSetLogs = state.completedSetLogs.map((log, i) =>
    i === state.completedSetLogs.length - 1
      ? { ...log, actualRestSeconds }
      : log
  );

  return {
    ...state,
    currentFlatIndex: state.currentFlatIndex + 1,
    phase: 'active',
    restStartedAt: null,
    restEndsAt: null,
    completedSetLogs: updatedSetLogs,
  };
}

export function getRemainingRestSeconds(state: WorkoutState): number {
  if (state.phase !== 'rest' || !state.restEndsAt) return 0;
  const now = new Date().getTime();
  const endsAt = new Date(state.restEndsAt).getTime();
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function isRestComplete(state: WorkoutState): boolean {
  return state.phase === 'rest' && getRemainingRestSeconds(state) <= 0;
}

export function updateActualReps(state: WorkoutState, setIndex: number, actualReps: number): WorkoutState {
  const updatedLogs = state.completedSetLogs.map((log, i) =>
    i === setIndex ? { ...log, actualReps } : log
  );
  return {
    ...state,
    completedSetLogs: updatedLogs,
    session: {
      ...state.session,
      setLogs: updatedLogs,
    },
  };
}
