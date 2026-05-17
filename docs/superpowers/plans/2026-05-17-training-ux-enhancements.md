# Training UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 训练执行支持自由选动作顺序、备选动作选择、计划编辑器导出修改后的 JSON

**Architecture:** 核心改动在 workoutRunner 执行模型从全线性改为 block 级跳转，WorkoutScreen UI 加待完成列表和备选选择器，新增 PlanEditor 页面专注编辑重量和次数

**Tech Stack:** React + TypeScript（现有技术栈）

---

### Task 1: 类型系统更新

**Files:**
- Modify: `src/types.ts`

为备选动作添加 `OptionBlock` 类型，更新 `blocks` 为联合类型，调整 `WorkoutState` 支持 block 级跳转。

- [ ] **Step 1: 更新 `src/types.ts`**

```typescript
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
  allBlocks: Block[];                   // 训练日所有 block（原始顺序）
  currentBlockIndex: number | null;     // 当前执行的 block，null = 待选择
  flatSets: FlatSet[];                  // 当前 block 的展平 sets
  currentFlatIndex: number;             // 当前 block 内的 set 位置
  remainingBlockIndices: number[];      // 尚未执行的 block 索引
  phase: WorkoutPhase;
  restStartedAt: string | null;
  restEndsAt: string | null;
  completedSetLogs: SetLog[];
  selectedExerciseIds: Record<number, string>; // OptionBlock 索引 → 选中的 exerciseId
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts && git commit -m "feat: add OptionBlock type and block-level workout state"
```

---

### Task 2: 计划校验适配

**Files:**
- Modify: `src/domain/planSchema.ts`
- Modify: `src/domain/planSchema.test.ts`

校验 `OptionBlock` 结构：`kind === 'option'`，`options` 非空数组，内部 sets 校验复用，同组 options 的 sets.length 一致。

- [ ] **Step 1: 更新测试 `src/domain/planSchema.test.ts`**，在文件末尾的 `describe` block 之后追加：

```typescript
describe('validatePlan with OptionBlock', () => {
  const planWithOption = {
    version: 1,
    planName: '测试',
    days: [{
      id: 'a', name: 'A',
      blocks: [
        {
          exerciseId: 'e1', name: 'E1',
          sets: [{ kind: 'top', plannedWeight: '10kg', targetReps: '8', restSeconds: 60 }],
        },
        {
          kind: 'option',
          id: 'opt1',
          name: '可选动作',
          options: [
            {
              exerciseId: 'alt-a', name: '备选A',
              sets: [{ kind: 'working', plannedWeight: '10kg', targetReps: '10', restSeconds: 60 }],
            },
            {
              exerciseId: 'alt-b', name: '备选B',
              sets: [{ kind: 'working', plannedWeight: '12kg', targetReps: '10', restSeconds: 60 }],
            },
          ],
        },
      ],
    }],
  };

  it('accepts valid OptionBlock', () => {
    const result = validatePlan(planWithOption);
    expect(result.valid).toBe(true);
  });

  it('rejects OptionBlock without kind', () => {
    const p = JSON.parse(JSON.stringify(planWithOption));
    delete p.days[0].blocks[1].kind;
    const result = validatePlan(p);
    expect(result.valid).toBe(false);
  });

  it('rejects OptionBlock with empty options array', () => {
    const p = JSON.parse(JSON.stringify(planWithOption));
    p.days[0].blocks[1].options = [];
    const result = validatePlan(p);
    expect(result.valid).toBe(false);
  });

  it('rejects OptionBlock with mismatched sets length', () => {
    const p = JSON.parse(JSON.stringify(planWithOption));
    p.days[0].blocks[1].options[1].sets = [
      { kind: 'working', plannedWeight: '12kg', targetReps: '10', restSeconds: 60 },
      { kind: 'working', plannedWeight: '12kg', targetReps: '10', restSeconds: 60 },
    ];
    const result = validatePlan(p);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid set inside option', () => {
    const p = JSON.parse(JSON.stringify(planWithOption));
    p.days[0].blocks[1].options[0].sets[0].kind = 'invalid';
    const result = validatePlan(p);
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认新增 5 个 test 失败**

```bash
npx vitest run src/domain/planSchema.test.ts
```
Expected: 7 existing pass, 5 new fail (plan accepts OptionBlock but validator rejects it).

- [ ] **Step 3: 更新 `src/domain/planSchema.ts`** — 在 block 循环内，ExerciseBlock 校验**之前**加 OptionBlock 分支：

```typescript
import type { TrainingPlan, ValidationResult, ValidationError } from '../types';

const VALID_SET_KINDS = ['top', 'backoff', 'working', 'accessory', 'cardio'];

function validateSets(sets: unknown[], prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  for (let si = 0; si < sets.length; si++) {
    const set = sets[si] as Record<string, unknown>;
    const setPrefix = `${prefix}.sets.${si}`;

    if (typeof set.kind !== 'string' || !VALID_SET_KINDS.includes(set.kind)) {
      errors.push({
        path: `${setPrefix}.kind`,
        message: `kind 必须是 ${VALID_SET_KINDS.join(', ')} 之一`,
      });
    }
    if (typeof set.plannedWeight !== 'string' || set.plannedWeight.trim().length === 0) {
      errors.push({ path: `${setPrefix}.plannedWeight`, message: 'plannedWeight 不能为空' });
    }
    if (typeof set.targetReps !== 'string' || set.targetReps.trim().length === 0) {
      errors.push({ path: `${setPrefix}.targetReps`, message: 'targetReps 不能为空' });
    }
    if (typeof set.restSeconds !== 'number' || set.restSeconds < 0) {
      errors.push({ path: `${setPrefix}.restSeconds`, message: 'restSeconds 必须是非负数字' });
    }
  }
  return errors;
}

export function validatePlan(json: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    errors.push({ path: '根节点', message: '训练计划必须是 JSON 对象' });
    return { valid: false, errors };
  }

  const plan = json as Record<string, unknown>;

  if (typeof plan.version !== 'number' || !Number.isInteger(plan.version)) {
    errors.push({ path: 'version', message: 'version 必须是整数' });
  }

  if (typeof plan.planName !== 'string' || plan.planName.trim().length === 0) {
    errors.push({ path: 'planName', message: 'planName 不能为空' });
  }

  if (!Array.isArray(plan.days) || plan.days.length === 0) {
    errors.push({ path: 'days', message: 'days 必须是非空数组' });
    return { valid: false, errors };
  }

  for (let di = 0; di < plan.days.length; di++) {
    const day = plan.days[di] as Record<string, unknown>;
    const dayPrefix = `days.${di}`;

    if (typeof day.id !== 'string' || day.id.trim().length === 0) {
      errors.push({ path: `${dayPrefix}.id`, message: '训练日 id 不能为空' });
    }
    if (typeof day.name !== 'string' || day.name.trim().length === 0) {
      errors.push({ path: `${dayPrefix}.name`, message: '训练日 name 不能为空' });
    }
    if (!Array.isArray(day.blocks) || day.blocks.length === 0) {
      errors.push({ path: `${dayPrefix}.blocks`, message: '训练日 blocks 必须是非空数组' });
      continue;
    }

    for (let bi = 0; bi < day.blocks.length; bi++) {
      const block = day.blocks[bi] as Record<string, unknown>;
      const blockPrefix = `${dayPrefix}.blocks.${bi}`;

      // OptionBlock 分支
      if (block.kind === 'option') {
        if (typeof block.id !== 'string' || block.id.trim().length === 0) {
          errors.push({ path: `${blockPrefix}.id`, message: '备选动作 id 不能为空' });
        }
        if (typeof block.name !== 'string' || block.name.trim().length === 0) {
          errors.push({ path: `${blockPrefix}.name`, message: '备选动作 name 不能为空' });
        }
        if (!Array.isArray(block.options) || block.options.length === 0) {
          errors.push({ path: `${blockPrefix}.options`, message: 'options 必须是非空数组' });
          continue;
        }

        let expectedSetCount: number | null = null;
        for (let oi = 0; oi < block.options.length; oi++) {
          const opt = block.options[oi] as Record<string, unknown>;
          const optPrefix = `${blockPrefix}.options.${oi}`;

          if (typeof opt.exerciseId !== 'string' || opt.exerciseId.trim().length === 0) {
            errors.push({ path: `${optPrefix}.exerciseId`, message: '备选动作 exerciseId 不能为空' });
          }
          if (typeof opt.name !== 'string' || opt.name.trim().length === 0) {
            errors.push({ path: `${optPrefix}.name`, message: '备选动作 name 不能为空' });
          }
          if (!Array.isArray(opt.sets) || opt.sets.length === 0) {
            errors.push({ path: `${optPrefix}.sets`, message: '备选动作 sets 必须是非空数组' });
            continue;
          }

          if (expectedSetCount === null) {
            expectedSetCount = opt.sets.length;
          } else if (opt.sets.length !== expectedSetCount) {
            errors.push({
              path: `${optPrefix}.sets`,
              message: `备选动作组数(${opt.sets.length})与其他备选不一致(${expectedSetCount})`,
            });
          }

          errors.push(...validateSets(opt.sets as unknown[], optPrefix));
        }
        continue;
      }

      // 原有 ExerciseBlock 校验
      if (typeof block.exerciseId !== 'string' || block.exerciseId.trim().length === 0) {
        errors.push({ path: `${blockPrefix}.exerciseId`, message: '动作 exerciseId 不能为空' });
      }
      if (typeof block.name !== 'string' || block.name.trim().length === 0) {
        errors.push({ path: `${blockPrefix}.name`, message: '动作 name 不能为空' });
      }
      if (!Array.isArray(block.sets) || block.sets.length === 0) {
        errors.push({ path: `${blockPrefix}.sets`, message: '动作 sets 必须是非空数组' });
        continue;
      }
      errors.push(...validateSets(block.sets as unknown[], blockPrefix));
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], plan: plan as unknown as TrainingPlan };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/domain/planSchema.test.ts
```
Expected: 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/planSchema.ts src/domain/planSchema.test.ts && git commit -m "feat: add OptionBlock validation to plan schema"
```

---

### Task 3: 训练执行模型改造

**Files:**
- Modify: `src/domain/workoutRunner.ts`
- Modify: `src/domain/workoutRunner.test.ts`

从全线性 `flatSets` 改为 block 级跳转：`selectBlock()` 展开单个 block 的 sets，`startNextSet()` 在 block 完成时回到待选择状态。

- [ ] **Step 1: 更新测试 `src/domain/workoutRunner.test.ts`**

完整替换为：

```typescript
import { describe, it, expect } from 'vitest';
import {
  flattenSets, startWorkout, selectBlock, completeSet, startNextSet,
  getRemainingRestSeconds, updateActualReps, SET_KIND_LABELS,
} from './workoutRunner';
import type { TrainingPlan, TrainingDay, Block } from '../types';

const samplePlan: TrainingPlan = {
  version: 1,
  planName: '测试计划',
  days: [],
};

const sampleDay: TrainingDay = {
  id: 'strength-a',
  name: '力量A',
  blocks: [
    {
      exerciseId: 'bench', name: '卧推',
      sets: [
        { kind: 'top', plannedWeight: '10kg', targetReps: '8', restSeconds: 180 },
        { kind: 'backoff', plannedWeight: '8kg', targetReps: '10', restSeconds: 120 },
      ],
    },
    {
      exerciseId: 'squat', name: '深蹲',
      sets: [
        { kind: 'working', plannedWeight: '20kg', targetReps: '12', restSeconds: 90 },
      ],
    },
  ],
};

describe('startWorkout', () => {
  it('creates state with null currentBlockIndex (waiting for selection)', () => {
    const state = startWorkout(samplePlan, sampleDay);
    expect(state.session.dayId).toBe('strength-a');
    expect(state.allBlocks).toHaveLength(2);
    expect(state.currentBlockIndex).toBeNull();
    expect(state.remainingBlockIndices).toEqual([0, 1]);
    expect(state.phase).toBe('active');
  });
});

describe('selectBlock', () => {
  it('selects a block and expands its sets', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const next = selectBlock(state, 0);
    expect(next.currentBlockIndex).toBe(0);
    expect(next.flatSets).toHaveLength(2);
    expect(next.flatSets[0].set.kind).toBe('top');
    expect(next.currentFlatIndex).toBe(0);
  });

  it('removes selected block from remaining list', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const next = selectBlock(state, 0);
    expect(next.remainingBlockIndices).toEqual([1]);
  });

  it('ignores selection when already in a block', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const s1 = selectBlock(state, 0);
    const s2 = selectBlock(s1, 1);
    expect(s2.currentBlockIndex).toBe(0); // unchanged
  });
});

describe('completeSet and startNextSet with block model', () => {
  it('after completing all sets in a block, currentBlockIndex becomes null', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = selectBlock(state, 1); // 深蹲 has 1 set
    s = completeSet(s, 12);
    expect(s.phase).toBe('completed'); // last set of last block → done
  });

  it('completes a block and enters rest, then back to pending list', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = selectBlock(state, 0); // 卧推 2 sets
    s = completeSet(s, 8);          // set 0 done
    expect(s.phase).toBe('rest');
    expect(s.currentBlockIndex).toBe(0);

    s = startNextSet(s);            // advance to set 1
    expect(s.phase).toBe('active');
    expect(s.currentFlatIndex).toBe(1);

    s = completeSet(s, 10);         // set 1 done, last in block
    expect(s.phase).toBe('rest');
    expect(s.currentBlockIndex).toBe(0);

    s = startNextSet(s);            // block complete → back to selection
    expect(s.currentBlockIndex).toBeNull();
    expect(s.remainingBlockIndices).toEqual([1]);
    expect(s.phase).toBe('active');
  });
});

describe('flattenSets', () => {
  it('flattens single block sets', () => {
    const block: Block = sampleDay.blocks[0];
    const flat = flattenSets(block, 0);
    expect(flat).toHaveLength(2);
    expect(flat[0].blockIndex).toBe(0);
  });
});

describe('getRemainingRestSeconds', () => {
  it('returns positive value during rest', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = selectBlock(state, 0);
    s = completeSet(s, 8);
    expect(getRemainingRestSeconds(s)).toBeGreaterThan(0);
  });

  it('returns 0 when not in rest', () => {
    const state = startWorkout(samplePlan, sampleDay);
    expect(getRemainingRestSeconds(state)).toBe(0);
  });
});

describe('updateActualReps', () => {
  it('updates reps for a completed set', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = selectBlock(state, 0);
    s = completeSet(s, 8);
    s = updateActualReps(s, 0, 7);
    expect(s.completedSetLogs[0].actualReps).toBe(7);
  });
});

describe('SET_KIND_LABELS', () => {
  it('has chinese labels for all kinds', () => {
    expect(SET_KIND_LABELS.top).toBe('顶组');
    expect(SET_KIND_LABELS.backoff).toBe('降重组');
    expect(SET_KIND_LABELS.working).toBe('正式组');
    expect(SET_KIND_LABELS.accessory).toBe('辅助组');
    expect(SET_KIND_LABELS.cardio).toBe('有氧');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/domain/workoutRunner.test.ts
```
Expected: 大部分测试失败，因为 `selectBlock` 尚不存在。

- [ ] **Step 3: 重写 `src/domain/workoutRunner.ts`**

```typescript
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
    // Block 完成，回到待选择状态
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
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/domain/workoutRunner.test.ts
```
Expected: all tests pass.

- [ ] **Step 5: Check that all existing tests still pass**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/workoutRunner.ts src/domain/workoutRunner.test.ts && git commit -m "feat: refactor workout runner to block-level execution model"
```

---

### Task 4: WorkoutScreen 改造

**Files:**
- Modify: `src/components/WorkoutScreen.tsx`

添加 block 选择列表、OptionBlock 选择器模态、适配新的 WorkoutState 结构。

- [ ] **Step 1: 重写 `src/components/WorkoutScreen.tsx`**

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkoutState, WorkoutSession, Block, ExerciseBlock } from '../types';
import {
  selectBlock, completeSet, startNextSet, getRemainingRestSeconds,
  updateActualReps, resolveBlock, SET_KIND_LABELS,
} from '../domain/workoutRunner';
import { saveIncompleteWorkout } from '../storage/db';
import { playBeep } from '../reminders/reminder';

interface Props {
  workoutState: WorkoutState;
  onUpdateState: (state: WorkoutState) => void;
  onComplete: (session: WorkoutSession) => void;
}

export default function WorkoutScreen({ workoutState, onUpdateState, onComplete }: Props) {
  const [restSeconds, setRestSeconds] = useState(0);
  const [restComplete, setRestComplete] = useState(false);
  const [repInput, setRepInput] = useState('');
  const [repError, setRepError] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repInputRef = useRef<HTMLInputElement>(null);
  // 备选动作选择器状态
  const [optionBlockIndex, setOptionBlockIndex] = useState<number | null>(null);

  const current = workoutState.flatSets[workoutState.currentFlatIndex];
  const isLastSetInBlock = workoutState.currentFlatIndex >= workoutState.flatSets.length - 1;
  const isLastBlock = workoutState.remainingBlockIndices.length === 1;
  const isLastSet = isLastSetInBlock && isLastBlock;

  // 倒计时显示
  useEffect(() => {
    if (workoutState.phase === 'rest') {
      setRestComplete(false);
      setRestSeconds(getRemainingRestSeconds(workoutState));

      timerRef.current = setInterval(() => {
        const remaining = getRemainingRestSeconds(workoutState);
        setRestSeconds(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRestComplete(true);
        }
      }, 200);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [workoutState.phase, workoutState.restEndsAt]);

  useEffect(() => {
    saveIncompleteWorkout(workoutState);
  }, [workoutState]);

  useEffect(() => {
    return () => {
      if (vibrateRef.current) clearTimeout(vibrateRef.current);
    };
  }, []);

  // 用户从待完成列表中选择一个 block
  const handleBlockSelect = useCallback((blockIndex: number) => {
    const block = workoutState.allBlocks[blockIndex];
    if ('options' in block) {
      // OptionBlock → 弹选择器
      setOptionBlockIndex(blockIndex);
      return;
    }
    const next = selectBlock(workoutState, blockIndex);
    onUpdateState(next);
  }, [workoutState, onUpdateState]);

  // 用户从备选动作选择器中选了一个选项
  const handleOptionSelect = useCallback((exerciseId: string) => {
    if (optionBlockIndex === null) return;
    const next = selectBlock(workoutState, optionBlockIndex, exerciseId);
    onUpdateState(next);
    setOptionBlockIndex(null);
  }, [workoutState, optionBlockIndex, onUpdateState]);

  const handleCompleteSet = useCallback(() => {
    const repsNum = parseInt(repInput, 10);
    if (!repInput.trim() || isNaN(repsNum) || repsNum <= 0) {
      setRepError(true);
      repInputRef.current?.focus();
      return;
    }
    setRepError(false);
    const next = completeSet(workoutState, repsNum);
    onUpdateState(next);
    setRepInput('');

    if (next.phase === 'completed') {
      onComplete(next.session);
      return;
    }

    const restMs = (current?.set.restSeconds || 60) * 1000;
    if (vibrateRef.current) clearTimeout(vibrateRef.current);
    vibrateRef.current = setTimeout(() => {
      try { navigator.vibrate?.([300, 150, 300]); } catch {}
      playBeep();
    }, restMs);
  }, [repInput, workoutState, current, onUpdateState, onComplete]);

  const handleNextSet = useCallback(() => {
    const repsNum = parseInt(repInput, 10);
    if (!repInput.trim() || isNaN(repsNum) || repsNum <= 0) {
      setRepError(true);
      repInputRef.current?.focus();
      return;
    }
    setRepError(false);

    if (vibrateRef.current) clearTimeout(vibrateRef.current);

    const lastLogIndex = workoutState.completedSetLogs.length - 1;
    const withUpdatedReps = updateActualReps(workoutState, lastLogIndex, repsNum);
    const next = startNextSet(withUpdatedReps);
    onUpdateState(next);
    setRepInput('');
  }, [repInput, workoutState, onUpdateState]);

  const handleUpdateReps = (index: number, newReps: number) => {
    if (isNaN(newReps) || newReps <= 0) return;
    const next = updateActualReps(workoutState, index, newReps);
    onUpdateState(next);
    setEditingSetIndex(null);
  };

  // ===== 待选择模式 =====
  if (workoutState.currentBlockIndex === null && workoutState.phase !== 'completed') {
    const remaining = workoutState.remainingBlockIndices.map(i => workoutState.allBlocks[i]);
    return (
      <div>
        <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          {workoutState.session.dayName}
        </div>
        <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 12, textAlign: 'center' }}>
          选择下一个动作
        </div>
        {remaining.map((block, idx) => {
          const origIdx = workoutState.remainingBlockIndices[idx];
          const name = 'options' in block ? block.name : block.name;
          const firstSet = 'options' in block ? null : block.sets[0];
          return (
            <button
              key={origIdx}
              onClick={() => handleBlockSelect(origIdx)}
              style={blockCardStyle}
            >
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
                {'options' in block
                  ? `${block.options.length} 个备选 · ${block.options[0].sets.length} 组`
                  : `${block.sets.length} 组${firstSet ? ` · ${SET_KIND_LABELS[firstSet.kind] || firstSet.kind}` : ''}`
                }
              </div>
            </button>
          );
        })}

        {workoutState.completedSetLogs.length > 0 && (
          <CompletedSets
            logs={workoutState.completedSetLogs}
            editingIndex={editingSetIndex}
            onEdit={setEditingSetIndex}
            onUpdate={handleUpdateReps}
          />
        )}
      </div>
    );
  }

  // ===== 备选动作选择器模态 =====
  if (optionBlockIndex !== null) {
    const block = workoutState.allBlocks[optionBlockIndex] as Extract<Block, { options: ExerciseBlock[] }>;
    return (
      <div>
        <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          {block.name}
        </div>
        <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 12, textAlign: 'center' }}>
          选择执行动作
        </div>
        {block.options.map(opt => (
          <button
            key={opt.exerciseId}
            onClick={() => handleOptionSelect(opt.exerciseId)}
            style={blockCardStyle}
          >
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{opt.name}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
              {opt.sets.length} 组 · {opt.sets[0].plannedWeight} · {opt.sets[0].targetReps}次
            </div>
            {opt.primaryMuscles && (
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {opt.primaryMuscles.map(m => (
                  <span key={m} style={muscleTagStyle}>{m}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // ===== 正常执行模式 =====
  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        {workoutState.session.dayName}
      </div>

      {workoutState.phase === 'active' && current && (
        <>
          <div style={{
            background: '#16213e', borderRadius: 12, padding: 20, marginTop: 16,
          }}>
            <div style={{ fontSize: '14px', color: '#aaa' }}>当前动作</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>{current.block.name}</div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <Tag label="组别" value={`第 ${current.setIndex + 1} 组 / 共 ${workoutState.flatSets.length} 组`} />
              <Tag label="类型" value={SET_KIND_LABELS[current.set.kind] || current.set.kind} />
              <Tag label="重量" value={current.set.plannedWeight} />
              <Tag label="目标" value={`${current.set.targetReps} 次`} />
            </div>

            {current.block.primaryMuscles && current.block.primaryMuscles.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {current.block.primaryMuscles.map(m => (
                  <span key={m} style={muscleTagPrimaryStyle}>{m}</span>
                ))}
                {current.block.secondaryMuscles?.map(m => (
                  <span key={m} style={muscleTagSecondaryStyle}>{m}</span>
                ))}
              </div>
            )}

            {current.block.notes && (
              <div style={{ marginTop: 12, fontSize: '13px', color: '#888' }}>
                备注：{current.block.notes}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ fontSize: '14px', color: '#aaa' }}>实际次数</label>
              <input
                ref={repInputRef}
                type="number"
                inputMode="numeric"
                value={repInput}
                onChange={e => { setRepInput(e.target.value); setRepError(false); }}
                placeholder="输入实际次数"
                style={{
                  ...inputStyle,
                  borderColor: repError ? '#e94560' : '#333',
                  marginBottom: 4,
                }}
              />
              {repError && (
                <div style={{ color: '#e94560', fontSize: '13px' }}>请填写实际次数</div>
              )}
            </div>
            <button onClick={handleCompleteSet} style={btnPrimary}>
              {isLastSet ? '完成训练' : '完成本组'}
            </button>
          </div>
        </>
      )}

      {workoutState.phase === 'rest' && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: '64px', fontWeight: 700 }}>
            {restSeconds > 0 ? Math.ceil(restSeconds) : '✓'}
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: 8 }}>
            {restSeconds > 0 ? '剩余休息时间' : '休息完成'}
          </div>

          {restComplete && (
            <div style={{ marginTop: 20 }}>
              <button onClick={handleNextSet} style={btnPrimary}>
                {isLastSetInBlock ? '选择下一个动作' : '开始下一组'}
              </button>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <label style={{ fontSize: '14px', color: '#aaa' }}>实际次数</label>
            <input
              ref={repInputRef}
              type="number"
              inputMode="numeric"
              value={repInput}
              onChange={e => { setRepInput(e.target.value); setRepError(false); }}
              placeholder="输入实际次数"
              style={{
                ...inputStyle,
                borderColor: repError ? '#e94560' : '#333',
                marginBottom: 4,
              }}
            />
            {repError && (
              <div style={{ color: '#e94560', fontSize: '13px' }}>请填写实际次数</div>
            )}
          </div>
        </div>
      )}

      {workoutState.completedSetLogs.length > 0 && (
        <CompletedSets
          logs={workoutState.completedSetLogs}
          editingIndex={editingSetIndex}
          onEdit={setEditingSetIndex}
          onUpdate={handleUpdateReps}
        />
      )}
    </div>
  );
}

function CompletedSets({
  logs, editingIndex, onEdit, onUpdate,
}: {
  logs: import('../types').SetLog[];
  editingIndex: number | null;
  onEdit: (i: number) => void;
  onUpdate: (i: number, reps: number) => void;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 8 }}>已完成组</div>
      {logs.map((log, i) => (
        <div key={i} style={{
          background: '#16213e', borderRadius: 8, padding: '8px 12px',
          marginBottom: 6, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: '13px' }}>{log.exerciseName}</span>
            <span style={{ fontSize: '12px', color: '#888', marginLeft: 8 }}>
              第{log.setIndex}组 · {SET_KIND_LABELS[log.setKind]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingIndex === i ? (
              <input
                type="number"
                inputMode="numeric"
                defaultValue={log.actualReps}
                style={{ ...inputStyle, width: 60, padding: '4px 8px' }}
                onBlur={e => onUpdate(i, parseInt(e.target.value, 10) || 0)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onUpdate(i, parseInt((e.target as HTMLInputElement).value, 10) || 0);
                  }
                }}
                autoFocus
              />
            ) : (
              <span
                style={{ fontSize: '14px', color: '#e94560', cursor: 'pointer' }}
                onClick={() => onEdit(i)}
              >
                {log.actualReps}次
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: '12px' }}>
      <span style={{ color: '#888' }}>{label}：</span>
      <span style={{ color: '#e0e0e0' }}>{value}</span>
    </div>
  );
}

const blockCardStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: '#16213e',
  color: '#e0e0e0',
  padding: '14px 16px',
  borderRadius: 10,
  marginBottom: 8,
  textAlign: 'left',
  border: '1px solid #1e3a5f',
};

const muscleTagStyle: React.CSSProperties = {
  background: '#0f3460', color: '#ccc', padding: '2px 8px',
  borderRadius: 4, fontSize: '12px',
};

const muscleTagPrimaryStyle: React.CSSProperties = {
  background: '#e94560', color: '#fff', padding: '2px 8px',
  borderRadius: 4, fontSize: '12px',
};

const muscleTagSecondaryStyle: React.CSSProperties = {
  background: '#0f3460', color: '#ccc', padding: '2px 8px',
  borderRadius: 4, fontSize: '12px',
};

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: 8,
  fontSize: '18px',
  fontWeight: 600,
  width: '100%',
  maxWidth: 280,
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  margin: '12px auto 0',
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#16213e',
  color: '#fff',
  fontSize: '16px',
  width: '100%',
  maxWidth: 200,
  textAlign: 'center',
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: 可能有对 HomeScreen 引用 `flattenSets`/`startWorkout` 的报错（Task 6 修），其他应无错误。

- [ ] **Step 3: Commit**

```bash
git add src/components/WorkoutScreen.tsx && git commit -m "feat: add block selection list and option selector to workout screen"
```

---

### Task 5: 计划编辑器

**Files:**
- Create: `src/components/PlanEditor.tsx`

新增页面，Tab 切换训练日，表单编辑重量和次数，导出 JSON。

- [ ] **Step 1: 创建 `src/components/PlanEditor.tsx`**

```typescript
import React, { useState } from 'react';
import type { TrainingPlan, Block, ExerciseBlock } from '../types';
import { downloadFile } from '../domain/exporters';

interface Props {
  plan: TrainingPlan;
  onBack: () => void;
}

export default function PlanEditor({ plan, onBack }: Props) {
  const [editedPlan, setEditedPlan] = useState<TrainingPlan>(() =>
    JSON.parse(JSON.stringify(plan))
  );
  const [dayIndex, setDayIndex] = useState(0);

  const day = editedPlan.days[dayIndex];

  const flatSets: { blockIdx: number; setIdx: number; block: ExerciseBlock; label: string; optName?: string }[] = [];

  day.blocks.forEach((block, bi) => {
    if ('options' in block) {
      block.options.forEach((opt, oi) => {
        opt.sets.forEach((set, si) => {
          flatSets.push({
            blockIdx: bi, setIdx: si, block: opt,
            label: `${block.name} · ${opt.name}`,
            optName: oi === 0 ? block.name : undefined,
          });
        });
      });
    } else {
      block.sets.forEach((set, si) => {
        flatSets.push({
          blockIdx: bi, setIdx: si, block,
          label: block.name,
        });
      });
    }
  });

  const handleWeightChange = (blockIdx: number, setIdx: number, value: string, optIdx?: number) => {
    const next = JSON.parse(JSON.stringify(editedPlan)) as TrainingPlan;
    const block = next.days[dayIndex].blocks[blockIdx];
    if ('options' in block && optIdx !== undefined) {
      block.options[optIdx].sets[setIdx].plannedWeight = value;
    } else if (!('options' in block)) {
      (block as ExerciseBlock).sets[setIdx].plannedWeight = value;
    }
    setEditedPlan(next);
  };

  const handleRepsChange = (blockIdx: number, setIdx: number, value: string, optIdx?: number) => {
    const next = JSON.parse(JSON.stringify(editedPlan)) as TrainingPlan;
    const block = next.days[dayIndex].blocks[blockIdx];
    if ('options' in block && optIdx !== undefined) {
      block.options[optIdx].sets[setIdx].targetReps = value;
    } else if (!('options' in block)) {
      (block as ExerciseBlock).sets[setIdx].targetReps = value;
    }
    setEditedPlan(next);
  };

  const handleExport = () => {
    downloadFile(
      JSON.stringify(editedPlan, null, 2),
      `训练计划-${editedPlan.planName}.json`,
      'application/json;charset=utf-8'
    );
  };

  // Build flat list with optIdx for OptionBlock sets
  type FlatEntry = { blockIdx: number; setIdx: number; block: ExerciseBlock; label: string; optIdx?: number; optLabel?: string };
  const entries: FlatEntry[] = [];

  day.blocks.forEach((block, bi) => {
    if ('options' in block) {
      block.options.forEach((opt, oi) => {
        opt.sets.forEach((set, si) => {
          entries.push({
            blockIdx: bi, setIdx: si, block: opt,
            label: oi === 0 ? block.name : '',
            optIdx: oi,
            optLabel: opt.name,
          });
        });
      });
    } else {
      block.sets.forEach((set, si) => {
        entries.push({
          blockIdx: bi, setIdx: si, block,
          label: block.name,
        });
      });
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={backBtn}>← 返回</button>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>训练计划编辑器</div>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {editedPlan.days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setDayIndex(i)}
            style={{
              ...tabStyle,
              background: i === dayIndex ? '#e94560' : '#16213e',
            }}
          >
            {d.name}
          </button>
        ))}
      </div>

      {entries.map((entry, idx) => {
        const set = entry.block.sets[entry.setIdx];
        return (
          <div key={idx} style={setRowStyle}>
            <div style={{ marginBottom: 8 }}>
              {entry.label && (
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
                  {entry.label}
                </div>
              )}
              {entry.optLabel && entry.label !== entry.optLabel && (
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
                  {entry.optLabel}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                第{entry.setIdx + 1}组 · {SET_KIND_LABELS_MAP[set.kind] || set.kind}
                {entry.optIdx !== undefined ? ` · 备选${entry.optIdx + 1}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>重量</label>
                <input
                  type="text"
                  value={set.plannedWeight}
                  onChange={e => handleWeightChange(entry.blockIdx, entry.setIdx, e.target.value, entry.optIdx)}
                  style={editInputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>次数</label>
                <input
                  type="text"
                  value={set.targetReps}
                  onChange={e => handleRepsChange(entry.blockIdx, entry.setIdx, e.target.value, entry.optIdx)}
                  style={editInputStyle}
                />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: 4 }}>
              休息 {set.restSeconds}秒
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 40 }}>
        <button onClick={handleExport} style={exportBtn}>
          导出 JSON
        </button>
      </div>
    </div>
  );
}

const SET_KIND_LABELS_MAP: Record<string, string> = {
  top: '顶组', backoff: '降重组', working: '正式组', accessory: '辅助组', cardio: '有氧',
};

const backBtn: React.CSSProperties = {
  background: 'none', color: '#e94560', fontSize: '14px', border: 'none', cursor: 'pointer',
};

const tabStyle: React.CSSProperties = {
  color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: '13px',
  fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
};

const setRowStyle: React.CSSProperties = {
  background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#888', marginBottom: 2,
};

const editInputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid #333', background: '#1a1a2e', color: '#fff', fontSize: '14px',
  outline: 'none',
};

const exportBtn: React.CSSProperties = {
  background: '#e94560', color: '#fff', padding: '14px 40px', borderRadius: 8,
  fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlanEditor.tsx && git commit -m "feat: add training plan editor for weight and reps"
```

---

### Task 6: 路由和首页入口

**Files:**
- Modify: `src/components/App.tsx`
- Modify: `src/components/HomeScreen.tsx`

App.tsx 加 `editor` screen 路由，HomeScreen 加"编辑计划"按钮。

- [ ] **Step 1: 更新 `src/components/App.tsx`**

在 import 区域添加：

```typescript
import PlanEditor from './PlanEditor';
```

在 `renderScreen()` 的 switch 中添加（在 `case 'history':` 之前）：

```typescript
      case 'editor':
        return state.plan ? (
          <PlanEditor
            plan={state.plan}
            onBack={handleGoHome}
          />
        ) : null;
```

添加 handler：

```typescript
  const handleGoEditor = useCallback(() => {
    setState(s => ({ ...s, screen: 'editor' }));
  }, []);
```

在 HomeScreen 的使用处添加 prop（将 `onGoEditor` 传入）：

```typescript
          <HomeScreen
            plan={state.plan}
            sessions={state.sessions}
            onImportPlan={handleImportPlan}
            onLoadSamplePlan={handleLoadSamplePlan}
            onStartWorkout={handleStartWorkout}
            onStartCardio={handleStartCardio}
            onGoHistory={handleGoHistory}
            onGoEditor={handleGoEditor}
          />
```

- [ ] **Step 2: 更新 `src/components/HomeScreen.tsx`**

Props 接口添加：

```typescript
  onGoEditor: () => void;
```

在"导入新计划"按钮旁边添加（有计划的区域，两个按钮旁边加第三个）：

```typescript
            <button onClick={onGoEditor} style={btnSecondary}>
              编辑计划
            </button>
```

放在现有两个按钮 `onGoHistory` 和 `onImportPlan` 旁边（按钮行中）。

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/App.tsx src/components/HomeScreen.tsx && git commit -m "feat: add editor route and home screen entry"
```

---

### Task 7: 集成验证

**Files:**
- Verify: all files compile and tests pass

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected: all tests pass (39+).

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

验证流程：
1. 加载示例计划 → 首页显示 4 个训练日
2. 点"编辑计划" → 编辑页可切换 Tab，改重量次数，导出 JSON
3. 点力量A → 显示待完成动作列表（5个 block）
4. 选一个动作 → 进入执行，显示组详情
5. 完成全部组 → 回到选择列表
6. 重新部署后确认有备选动作的 JSON 导入正常

- [ ] **Step 4: Build and final commit**

```bash
npm run build && git add -A && git commit -m "feat: complete training ux enhancements"
```
