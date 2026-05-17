// ========== 训练计划结构 ==========

export type SetKind = 'top' | 'backoff' | 'working' | 'accessory' | 'cardio';

export interface TrainingSet {
  kind: SetKind;
  plannedWeight: string;
  targetReps: string;
  restSeconds: number;
}

export interface ExerciseBlock {
  exerciseId: string;
  name: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  notes?: string;
  progressionHint?: string;
  sets: TrainingSet[];
}

export interface OptionBlock {
  kind: 'option';
  id: string;
  name: string;
  options: ExerciseBlock[];
}

export type Block = ExerciseBlock | OptionBlock;

export interface TrainingDay {
  id: string;
  name: string;
  focus?: string;
  blocks: Block[];
}

export interface TrainingPlan {
  version: number;
  planName: string;
  days: TrainingDay[];
}

// ========== 训练记录结构 ==========

export interface SetLog {
  sessionId: string;
  dayId: string;
  dayName: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  setKind: SetKind;
  plannedWeight: string;
  targetReps: string;
  actualReps: number;
  plannedRestSeconds: number;
  actualRestSeconds: number;
  completedAt: string;
}

export interface CardioLog {
  sessionId: string;
  dayId: string;
  dayName: string;
  activity: string;
  targetDurationMinutes: string;
  targetHeartRate: string;
  actualDurationMinutes: number;
  actualHeartRate: string;
  notes: string;
  completedAt: string;
}

export interface WorkoutSession {
  sessionId: string;
  planName: string;
  planVersion: number;
  dayId: string;
  dayName: string;
  focus?: string;
  startedAt: string;
  finishedAt?: string;
  setLogs?: SetLog[];
  cardioLog?: CardioLog;
}

// ========== 训练执行状态 ==========

export type WorkoutPhase = 'active' | 'rest' | 'completed';

export interface FlatSet {
  blockIndex: number;
  setIndex: number;
  block: ExerciseBlock;
  set: TrainingSet;
}

export interface WorkoutState {
  session: WorkoutSession;
  allBlocks: Block[];
  currentBlockIndex: number | null;
  flatSets: FlatSet[];
  currentFlatIndex: number;
  remainingBlockIndices: number[];
  phase: WorkoutPhase;
  restStartedAt: string | null;
  restEndsAt: string | null;
  completedSetLogs: SetLog[];
  selectedExerciseIds: Record<number, string>;
}

// ========== UI 状态 ==========

export type Screen = 'home' | 'workout' | 'cardio' | 'summary' | 'history' | 'editor';

export interface AppState {
  screen: Screen;
  plan: TrainingPlan | null;
  workoutState: WorkoutState | null;
  completedSession: WorkoutSession | null;
  sessions: WorkoutSession[];
}

// ========== 计划校验结果 ==========

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  plan?: TrainingPlan;
}
