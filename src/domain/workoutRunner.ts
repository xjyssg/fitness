import type {
  TrainingDay, TrainingPlan, WorkoutSession, WorkoutState,
  FlatSet, SetLog, WorkoutPhase, Block, ExerciseBlock,
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

export function flattenSets(block: Block, blockIndex: number): FlatSet[] {
  const exBlock = block as ExerciseBlock;
  const result: FlatSet[] = [];
  for (let si = 0; si < exBlock.sets.length; si++) {
    result.push({ blockIndex, setIndex: si, block: exBlock, set: exBlock.sets[si] });
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
  const allBlockIndices = day.blocks.map((_, i) => i);

  return {
    session,
    allBlocks: day.blocks,
    currentBlockIndex: null,
    flatSets: [],
    currentFlatIndex: 0,
    remainingBlockIndices: allBlockIndices,
    phase: 'active' as WorkoutPhase,
    restStartedAt: null,
    restEndsAt: null,
    completedSetLogs: [],
    selectedExerciseIds: {},
  };
}

export function resolveBlock(block: Block, optionExerciseId?: string): ExerciseBlock {
  if ('options' in block) {
    const selected = optionExerciseId
      ? block.options.find(o => o.exerciseId === optionExerciseId)
      : undefined;
    return selected || block.options[0];
  }
  return block;
}

export function selectBlock(state: WorkoutState, blockIndex: number, optionExerciseId?: string): WorkoutState {
  if (state.currentBlockIndex !== null) return state;

  const block = state.allBlocks[blockIndex];
  const resolved = resolveBlock(block, optionExerciseId);

  const selectedExerciseIds = { ...state.selectedExerciseIds };
  if ('options' in block) {
    selectedExerciseIds[blockIndex] = resolved.exerciseId;
  }

  return {
    ...state,
    currentBlockIndex: blockIndex,
    flatSets: flattenSets(resolved, blockIndex),
    currentFlatIndex: 0,
    selectedExerciseIds,
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

  const isLastSetInBlock = state.currentFlatIndex >= state.flatSets.length - 1;
  const isLastBlock = state.remainingBlockIndices.length === 1;
  const isLastSet = isLastSetInBlock && isLastBlock;
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

  const isLastSetInBlock = state.currentFlatIndex >= state.flatSets.length - 1;

  if (isLastSetInBlock) {
    const remainingBlockIndices = state.remainingBlockIndices.filter(
      i => i !== state.currentBlockIndex
    );
    return {
      ...state,
      currentBlockIndex: null,
      flatSets: [],
      currentFlatIndex: 0,
      remainingBlockIndices,
      phase: 'active',
      restStartedAt: null,
      restEndsAt: null,
      completedSetLogs: updatedSetLogs,
    };
  }

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
