# 训练助手 PWA 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零构建一个手机端中文训练辅助 PWA，支持导入训练计划、执行力量/有氧训练、组间休息倒计时、导出训练记录。

**Architecture:** Vite + React + TypeScript 单页应用，local-first 使用 IndexedDB 存储，无服务端。核心分为类型定义 → 存储层 → 领域逻辑（计划解析、训练执行、导出、提醒、提示）→ UI 组件（首页、训练、有氧、总结、历史）→ PWA 配置。

**Tech Stack:** Vite 5, React 18, TypeScript 5, idb (IndexedDB wrapper), VitePWA plugin

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`

- [ ] **Step 1: 初始化 package.json**

```bash
cd /Users/xue/Documents/fitness && npm init -y
```

- [ ] **Step 2: 安装依赖**

```bash
npm install react@^18 react-dom@^18 idb@^8
npm install -D typescript@^5 vite@^5 @vitejs/plugin-react@^4 @types/react@^18 @types/react-dom@^18 vite-plugin-pwa@^0
```

- [ ] **Step 3: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '训练助手',
        short_name: '训练助手',
        description: '离线训练记录',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 5: 创建 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>训练助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 `src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: 创建 `src/index.css`（基础重置样式）**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100dvh;
  -webkit-tap-highlight-color: transparent;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  outline: none;
}

input, textarea {
  font-family: inherit;
  font-size: 16px;
}
```

- [ ] **Step 8: 验证项目能启动**

```bash
npx vite --host
```
Expected: dev server 启动，浏览器打开显示空白页面，无控制台报错。

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold vite + react + typescript project"
```

---

### Task 2: 类型定义

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: 创建 `src/types.ts`**

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

export interface TrainingDay {
  id: string;
  name: string;
  focus?: string;
  blocks: ExerciseBlock[];
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
  flatSets: FlatSet[];
  currentFlatIndex: number;
  phase: WorkoutPhase;
  restStartedAt: string | null;
  restEndsAt: string | null;
  completedSetLogs: SetLog[];
}

// ========== UI 状态 ==========

export type Screen = 'home' | 'workout' | 'cardio' | 'summary' | 'history';

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

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```
Expected: 无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/types.ts && git commit -m "feat: add type definitions for training plan, logs, and app state"
```

---

### Task 3: 训练计划校验模块

**Files:**
- Create: `src/domain/planSchema.ts`

- [ ] **Step 1: 创建 `src/domain/planSchema.ts`**

```typescript
import type { TrainingPlan, ValidationResult, ValidationError } from '../types';

const VALID_SET_KINDS = ['top', 'backoff', 'working', 'accessory', 'cardio'];

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

      for (let si = 0; si < block.sets.length; si++) {
        const set = block.sets[si] as Record<string, unknown>;
        const setPrefix = `${blockPrefix}.sets.${si}`;

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
          errors.push({
            path: `${setPrefix}.restSeconds`,
            message: 'restSeconds 必须是非负数字',
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], plan: plan as unknown as TrainingPlan };
}
```

- [ ] **Step 2: 创建校验测试**

```bash
npm install -D vitest @types/node
```

然后创建 `src/domain/planSchema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validatePlan } from './planSchema';

const validPlan = {
  version: 1,
  planName: '测试计划',
  days: [
    {
      id: 'strength-a',
      name: '力量A',
      blocks: [
        {
          exerciseId: 'smith-bench',
          name: '史密斯卧推',
          sets: [
            { kind: 'top', plannedWeight: '两边各7.5kg', targetReps: '6-8', restSeconds: 180 },
          ],
        },
      ],
    },
  ],
};

describe('validatePlan', () => {
  it('accepts valid plan', () => {
    const result = validatePlan(validPlan);
    expect(result.valid).toBe(true);
    expect(result.plan).toBeDefined();
  });

  it('rejects null', () => {
    const result = validatePlan(null);
    expect(result.valid).toBe(false);
  });

  it('rejects missing planName', () => {
    const plan = { ...validPlan, planName: '' };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'planName')).toBe(true);
  });

  it('rejects empty days array', () => {
    const plan = { ...validPlan, days: [] };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid set kind', () => {
    const plan = {
      ...validPlan,
      days: [
        {
          id: 'a', name: 'A', blocks: [
            {
              exerciseId: 'e1', name: 'E1',
              sets: [{ kind: 'invalid', plannedWeight: '10kg', targetReps: '10', restSeconds: 60 }],
            },
          ],
        },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('rejects negative restSeconds', () => {
    const plan = {
      ...validPlan,
      days: [
        {
          id: 'a', name: 'A', blocks: [
            {
              exerciseId: 'e1', name: 'E1',
              sets: [{ kind: 'top', plannedWeight: '10kg', targetReps: '10', restSeconds: -1 }],
            },
          ],
        },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('rejects missing exerciseId', () => {
    const plan = {
      ...validPlan,
      days: [
        {
          id: 'a', name: 'A', blocks: [
            {
              exerciseId: '', name: 'E1',
              sets: [{ kind: 'top', plannedWeight: '10kg', targetReps: '10', restSeconds: 60 }],
            },
          ],
        },
      ],
    };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 3: 运行测试验证**

```bash
npx vitest run src/domain/planSchema.test.ts
```
Expected: 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/domain/planSchema.ts src/domain/planSchema.test.ts package.json && git commit -m "feat: add training plan schema validation"
```

---

### Task 4: 旧版计划文案迁移

**Files:**
- Create: `src/domain/planMigration.ts`
- Create: `src/domain/planMigration.test.ts`

- [ ] **Step 1: 创建 `src/domain/planMigration.ts`**

```typescript
import type { TrainingPlan, TrainingDay, ExerciseBlock, TrainingSet } from '../types';

const ENGLISH_SET_KIND_MAP: Record<string, string> = {
  'top set': 'top',
  'backoff set': 'backoff',
  'working set': 'working',
  'accessory': 'accessory',
  'cardio': 'cardio',
};

export function migrateEnglishPlan(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    days: plan.days.map(day => ({
      ...day,
      blocks: day.blocks.map(block => ({
        ...block,
        sets: block.sets.map(set => {
          const englishKind = set.kind.toLowerCase();
          const mapped = ENGLISH_SET_KIND_MAP[englishKind];
          const kind = mapped || set.kind;

          let { plannedWeight } = set;
          if (plannedWeight.toLowerCase().includes('kg each side')) {
            plannedWeight = plannedWeight.replace(/kg each side/i, 'kg').replace(/^/, '两边各');
          }
          if (plannedWeight.toLowerCase().includes('each side')) {
            plannedWeight = plannedWeight.replace(/each side/i, '').trim();
            plannedWeight = `两边各${plannedWeight}`;
          }

          return { ...set, kind: kind as TrainingSet['kind'], plannedWeight } as TrainingSet;
        }),
      })),
    })),
  };
}

export function needsMigration(plan: TrainingPlan): boolean {
  return plan.days.some(day =>
    day.blocks.some(block =>
      block.sets.some(set => {
        const lower = set.kind.toLowerCase();
        return Object.keys(ENGLISH_SET_KIND_MAP).includes(lower) && ENGLISH_SET_KIND_MAP[lower] !== lower;
      })
    )
  );
}
```

- [ ] **Step 2: 创建 `src/domain/planMigration.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { migrateEnglishPlan, needsMigration } from './planMigration';
import type { TrainingPlan } from '../types';

const englishPlan: TrainingPlan = {
  version: 1,
  planName: 'Test Plan',
  days: [
    {
      id: 'a', name: 'Day A',
      blocks: [
        {
          exerciseId: 'bench', name: 'Bench Press',
          sets: [
            { kind: 'top set' as any, plannedWeight: '10kg each side', targetReps: '8', restSeconds: 180 },
          ],
        },
      ],
    },
  ],
};

describe('needsMigration', () => {
  it('detects english set kinds', () => {
    expect(needsMigration(englishPlan)).toBe(true);
  });

  it('returns false for already-migrated plan', () => {
    const migrated = migrateEnglishPlan(englishPlan);
    expect(needsMigration(migrated)).toBe(false);
  });
});

describe('migrateEnglishPlan', () => {
  it('converts top set to top', () => {
    const result = migrateEnglishPlan(englishPlan);
    expect(result.days[0].blocks[0].sets[0].kind).toBe('top');
  });

  it('converts each side weight format', () => {
    const result = migrateEnglishPlan(englishPlan);
    expect(result.days[0].blocks[0].sets[0].plannedWeight).toBe('两边各10kg');
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/domain/planMigration.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/domain/planMigration.ts src/domain/planMigration.test.ts && git commit -m "feat: add english plan migration for legacy imports"
```

---

### Task 5: IndexedDB 存储层

**Files:**
- Create: `src/storage/db.ts`
- Create: `src/storage/db.test.ts`

- [ ] **Step 1: 创建 `src/storage/db.ts`**

```typescript
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

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear('meta');
  await db.clear('sessions');
  await db.clear('incompleteWorkout');
}
```

- [ ] **Step 2: 创建 `src/storage/db.test.ts`**

```typescript
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
  flatSets: [],
  currentFlatIndex: 0,
  phase: 'active',
  restStartedAt: null,
  restEndsAt: null,
  completedSetLogs: [],
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
```

- [ ] **Step 3: 安装 fake-indexeddb 测试依赖**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 4: 运行测试**

```bash
npx vitest run src/storage/db.test.ts
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/storage/db.ts src/storage/db.test.ts package.json && git commit -m "feat: add indexeddb storage layer"
```

---

### Task 6: 内置示例训练计划

**Files:**
- Create: `src/samplePlans/currentTrainingPlan.json`

- [ ] **Step 1: 创建 `src/samplePlans/currentTrainingPlan.json`**

```json
{
  "version": 1,
  "planName": "8周训练计划 2026-05",
  "days": [
    {
      "id": "strength-a",
      "name": "力量A",
      "focus": "上肢推拉 + 下肢中等强度",
      "blocks": [
        {
          "exerciseId": "smith-bench",
          "name": "史密斯卧推",
          "primaryMuscles": ["胸大肌"],
          "secondaryMuscles": ["肱三头肌", "三角肌前束"],
          "progressionHint": "顶组达到 8 次后可考虑小幅加重。",
          "sets": [
            { "kind": "top", "plannedWeight": "两边各7.5kg", "targetReps": "6-8", "restSeconds": 180 },
            { "kind": "backoff", "plannedWeight": "两边各5kg", "targetReps": "8-10", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "lat-pulldown",
          "name": "高位下拉",
          "primaryMuscles": ["背阔肌"],
          "secondaryMuscles": ["肱二头肌"],
          "notes": "注意肩胛骨收紧",
          "sets": [
            { "kind": "top", "plannedWeight": "33kg", "targetReps": "8-10", "restSeconds": 150 },
            { "kind": "backoff", "plannedWeight": "26kg", "targetReps": "10-12", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "dumbbell-shoulder-press",
          "name": "哑铃推肩",
          "primaryMuscles": ["三角肌前束"],
          "secondaryMuscles": ["肱三头肌"],
          "sets": [
            { "kind": "working", "plannedWeight": "10kg每只", "targetReps": "10-12", "restSeconds": 120 },
            { "kind": "working", "plannedWeight": "10kg每只", "targetReps": "10-12", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "goblet-squat",
          "name": "高脚杯深蹲",
          "primaryMuscles": ["股四头肌"],
          "secondaryMuscles": ["臀大肌"],
          "sets": [
            { "kind": "working", "plannedWeight": "20kg", "targetReps": "10-12", "restSeconds": 120 },
            { "kind": "working", "plannedWeight": "20kg", "targetReps": "10-12", "restSeconds": 120 }
          ]
        }
      ]
    },
    {
      "id": "strength-b",
      "name": "力量B",
      "focus": "下肢主导 + 上肢辅助",
      "blocks": [
        {
          "exerciseId": "barbell-squat",
          "name": "杠铃深蹲",
          "primaryMuscles": ["股四头肌"],
          "secondaryMuscles": ["臀大肌", "腘绳肌"],
          "progressionHint": "顶组达到 8 次后可考虑小幅加重。",
          "sets": [
            { "kind": "top", "plannedWeight": "两边各10kg", "targetReps": "6-8", "restSeconds": 180 },
            { "kind": "backoff", "plannedWeight": "两边各7.5kg", "targetReps": "8-10", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "romanian-deadlift",
          "name": "罗马尼亚硬拉",
          "primaryMuscles": ["腘绳肌"],
          "secondaryMuscles": ["臀大肌", "竖脊肌"],
          "sets": [
            { "kind": "working", "plannedWeight": "两边各10kg", "targetReps": "10-12", "restSeconds": 120 },
            { "kind": "working", "plannedWeight": "两边各10kg", "targetReps": "10-12", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "leg-press",
          "name": "腿举",
          "primaryMuscles": ["股四头肌"],
          "secondaryMuscles": ["臀大肌"],
          "notes": "控制离心收缩",
          "sets": [
            { "kind": "accessory", "plannedWeight": "80kg", "targetReps": "12-15", "restSeconds": 90 },
            { "kind": "accessory", "plannedWeight": "80kg", "targetReps": "12-15", "restSeconds": 90 }
          ]
        }
      ]
    },
    {
      "id": "strength-c",
      "name": "力量C",
      "focus": "上肢综合 + 核心",
      "blocks": [
        {
          "exerciseId": "dumbbell-bench",
          "name": "哑铃卧推",
          "primaryMuscles": ["胸大肌"],
          "secondaryMuscles": ["肱三头肌", "三角肌前束"],
          "sets": [
            { "kind": "top", "plannedWeight": "17.5kg每只", "targetReps": "8-10", "restSeconds": 150 },
            { "kind": "backoff", "plannedWeight": "15kg每只", "targetReps": "10-12", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "seated-row",
          "name": "坐姿划船",
          "primaryMuscles": ["背阔肌"],
          "secondaryMuscles": ["肱二头肌", "后三角肌"],
          "sets": [
            { "kind": "working", "plannedWeight": "33kg", "targetReps": "10-12", "restSeconds": 120 },
            { "kind": "working", "plannedWeight": "33kg", "targetReps": "10-12", "restSeconds": 120 }
          ]
        },
        {
          "exerciseId": "lateral-raise",
          "name": "侧平举",
          "primaryMuscles": ["三角肌中束"],
          "sets": [
            { "kind": "accessory", "plannedWeight": "6kg每只", "targetReps": "12-15", "restSeconds": 60 },
            { "kind": "accessory", "plannedWeight": "6kg每只", "targetReps": "12-15", "restSeconds": 60 }
          ]
        },
        {
          "exerciseId": "plank",
          "name": "平板支撑",
          "primaryMuscles": ["核心"],
          "notes": "每组至力竭",
          "sets": [
            { "kind": "accessory", "plannedWeight": "自重", "targetReps": "至力竭", "restSeconds": 60 },
            { "kind": "accessory", "plannedWeight": "自重", "targetReps": "至力竭", "restSeconds": 60 }
          ]
        }
      ]
    },
    {
      "id": "cardio",
      "name": "有氧",
      "focus": "低强度稳态有氧",
      "blocks": [
        {
          "exerciseId": "treadmill-incline",
          "name": "爬坡跑步机",
          "notes": "坡度10-12，速度4-5km/h",
          "sets": [
            { "kind": "cardio", "plannedWeight": "心率130-140", "targetReps": "30-45分钟", "restSeconds": 0 }
          ]
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: 验证 JSON 合法且能被校验**

```bash
npx vitest run -e "test('sample plan is valid', () => { const { validatePlan } = require('./src/domain/planSchema'); const plan = require('./src/samplePlans/currentTrainingPlan.json'); expect(validatePlan(plan).valid).toBe(true); })"
```

- [ ] **Step 3: Commit**

```bash
git add src/samplePlans/currentTrainingPlan.json && git commit -m "feat: add built-in sample training plan"
```

---

### Task 7: 训练执行模块

**Files:**
- Create: `src/domain/workoutRunner.ts`
- Create: `src/domain/workoutRunner.test.ts`

组类型中文标签映射在 workoutRunner.ts 中集中定义以便复用。

- [ ] **Step 1: 创建 `src/domain/workoutRunner.ts`**

```typescript
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

  const lastLog = state.completedSetLogs[state.completedSetLogs.length - 1];
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
  const isLastSet = state.currentFlatIndex >= state.flatSets.length - 1;
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

- [ ] **Step 2: 创建 `src/domain/workoutRunner.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  flattenSets, startWorkout, completeSet, startNextSet,
  getRemainingRestSeconds, updateActualReps, SET_KIND_LABELS,
} from './workoutRunner';
import type { TrainingPlan, TrainingDay } from '../types';

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

describe('flattenSets', () => {
  it('flattens all sets from all blocks', () => {
    const flat = flattenSets(sampleDay);
    expect(flat).toHaveLength(3);
    expect(flat[0].set.kind).toBe('top');
    expect(flat[1].set.kind).toBe('backoff');
    expect(flat[2].set.kind).toBe('working');
  });
});

describe('startWorkout', () => {
  it('creates workout state with session', () => {
    const state = startWorkout(samplePlan, sampleDay);
    expect(state.session.dayId).toBe('strength-a');
    expect(state.flatSets).toHaveLength(3);
    expect(state.currentFlatIndex).toBe(0);
    expect(state.phase).toBe('active');
  });
});

describe('completeSet', () => {
  it('completes a set and enters rest', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const next = completeSet(state, 8);
    expect(next.phase).toBe('rest');
    expect(next.completedSetLogs).toHaveLength(1);
    expect(next.completedSetLogs[0].actualReps).toBe(8);
    expect(next.restEndsAt).toBeTruthy();
  });

  it('completes last set and finishes workout', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = completeSet(state, 8);   // set 0
    s = startNextSet(s);
    s = completeSet(s, 10);          // set 1
    s = startNextSet(s);
    s = completeSet(s, 12);          // set 2 (last)
    expect(s.phase).toBe('completed');
    expect(s.session.finishedAt).toBeTruthy();
    expect(s.session.setLogs).toHaveLength(3);
  });
});

describe('startNextSet', () => {
  it('advances to next set and records actualRestSeconds', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = completeSet(state, 8);
    s = startNextSet(s);
    expect(s.phase).toBe('active');
    expect(s.currentFlatIndex).toBe(1);
    expect(s.completedSetLogs[0].actualRestSeconds).toBeGreaterThanOrEqual(0);
  });

  it('does nothing when not in rest phase', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const s = startNextSet(state);
    expect(s.currentFlatIndex).toBe(0);
    expect(s.phase).toBe('active');
  });
});

describe('getRemainingRestSeconds', () => {
  it('returns positive value during rest', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const s = completeSet(state, 8);
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
    let s = completeSet(state, 8);
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

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/domain/workoutRunner.test.ts
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/domain/workoutRunner.ts src/domain/workoutRunner.test.ts && git commit -m "feat: add workout execution runner with set tracking"
```

---

### Task 8: 提醒模块

**Files:**
- Create: `src/reminders/reminder.ts`
- Create: `src/reminders/reminder.test.ts`

- [ ] **Step 1: 创建 `src/reminders/reminder.ts`**

```typescript
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    audioContext = new AudioContext();
    return audioContext;
  } catch {
    return null;
  }
}

export async function playBeep(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.stop(now + 0.3);

    return true;
  } catch {
    return false;
  }
}

export async function vibrate(): Promise<boolean> {
  if (!navigator.vibrate) return false;
  try {
    navigator.vibrate([200, 100, 200]);
    return true;
  } catch {
    return false;
  }
}

export async function notifyRestComplete(): Promise<{ soundOk: boolean; vibrateOk: boolean }> {
  const [soundOk, vibrateOk] = await Promise.all([playBeep(), vibrate()]);
  return { soundOk, vibrateOk };
}
```

- [ ] **Step 2: 创建 `src/reminders/reminder.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { vibrate } from './reminder';

describe('vibrate', () => {
  it('returns false when vibrate not supported', async () => {
    const ok = await vibrate();
    expect(ok).toBe(false);
  });

  it('calls navigator.vibrate when available', async () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });
    const ok = await vibrate();
    expect(ok).toBe(true);
    expect(vibrateMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/reminders/reminder.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/reminders/reminder.ts src/reminders/reminder.test.ts && git commit -m "feat: add rest-complete reminder with sound and vibration"
```

---

### Task 9: 导出模块

**Files:**
- Create: `src/domain/exporters.ts`
- Create: `src/domain/exporters.test.ts`

- [ ] **Step 1: 创建 `src/domain/exporters.ts`**

```typescript
import type { WorkoutSession, SetLog } from '../types';

function escapeCSVField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const SET_LOG_HEADERS = [
  'sessionId', 'dayId', 'dayName', 'exerciseId', 'exerciseName',
  'setIndex', 'setKind', 'plannedWeight', 'targetReps', 'actualReps',
  'plannedRestSeconds', 'actualRestSeconds', 'completedAt',
];

function setLogToCSVRow(log: SetLog): string {
  return [
    log.sessionId, log.dayId, log.dayName, log.exerciseId, log.exerciseName,
    log.setIndex, log.setKind, log.plannedWeight, log.targetReps, log.actualReps,
    log.plannedRestSeconds, log.actualRestSeconds, log.completedAt,
  ].map(escapeCSVField).join(',');
}

function setLogsToCSV(session: WorkoutSession): string {
  const rows = (session.setLogs || []).map(setLogToCSVRow);
  if (rows.length === 0) return SET_LOG_HEADERS.join(',');
  return [SET_LOG_HEADERS.join(','), ...rows].join('\n');
}

function cardioLogToCSV(session: WorkoutSession): string {
  const log = session.cardioLog;
  if (!log) return '';
  const header = 'sessionId,dayId,dayName,activity,targetDurationMinutes,targetHeartRate,actualDurationMinutes,actualHeartRate,notes,completedAt';
  const row = [
    log.sessionId, log.dayId, log.dayName, log.activity,
    log.targetDurationMinutes, log.targetHeartRate,
    log.actualDurationMinutes, log.actualHeartRate,
    log.notes, log.completedAt,
  ].map(escapeCSVField).join(',');
  return [header, row].join('\n');
}

export function exportSessionToCSV(session: WorkoutSession): string {
  if (session.cardioLog) {
    return cardioLogToCSV(session);
  }
  return setLogsToCSV(session);
}

export function exportSessionToJSON(session: WorkoutSession): string {
  return JSON.stringify(session, null, 2);
}

export function exportAllSessionsToCSV(sessions: WorkoutSession[]): string {
  const allRows: string[] = [SET_LOG_HEADERS.join(',')];
  for (const session of sessions) {
    if (session.cardioLog) continue;
    const rows = (session.setLogs || []).map(setLogToCSVRow);
    allRows.push(...rows);
  }
  return allRows.join('\n');
}

export function exportAllSessionsToJSON(sessions: WorkoutSession[]): string {
  return JSON.stringify(sessions, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['﻿' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: 创建 `src/domain/exporters.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  exportSessionToCSV, exportSessionToJSON,
  exportAllSessionsToCSV, exportAllSessionsToJSON,
} from './exporters';
import type { WorkoutSession } from '../types';

const strengthSession: WorkoutSession = {
  sessionId: 'test-2026-05-17T10:00:00+08:00',
  planName: '测试计划',
  planVersion: 1,
  dayId: 'strength-a',
  dayName: '力量A',
  startedAt: '2026-05-17T10:00:00+08:00',
  finishedAt: '2026-05-17T11:00:00+08:00',
  setLogs: [
    {
      sessionId: 'test-2026-05-17T10:00:00+08:00',
      dayId: 'strength-a',
      dayName: '力量A',
      exerciseId: 'bench',
      exerciseName: '卧推',
      setIndex: 1,
      setKind: 'top',
      plannedWeight: '两边各7.5kg',
      targetReps: '6-8',
      actualReps: 8,
      plannedRestSeconds: 180,
      actualRestSeconds: 165,
      completedAt: '2026-05-17T10:05:00+08:00',
    },
  ],
};

const cardioSession: WorkoutSession = {
  sessionId: 'cardio-2026-05-17T10:00:00+08:00',
  planName: '测试计划',
  planVersion: 1,
  dayId: 'cardio',
  dayName: '有氧',
  startedAt: '2026-05-17T10:00:00+08:00',
  finishedAt: '2026-05-17T10:45:00+08:00',
  cardioLog: {
    sessionId: 'cardio-2026-05-17T10:00:00+08:00',
    dayId: 'cardio',
    dayName: '有氧',
    activity: '爬坡跑步机',
    targetDurationMinutes: '30-45分钟',
    targetHeartRate: '心率130-140',
    actualDurationMinutes: 40,
    actualHeartRate: '132-142',
    notes: '状态稳定',
    completedAt: '2026-05-17T10:45:00+08:00',
  },
};

describe('exportSessionToCSV', () => {
  it('exports strength session with BOM and headers', () => {
    const csv = exportSessionToCSV(strengthSession);
    expect(csv).toContain('sessionId,dayId');
    expect(csv).toContain('两边各7.5kg');
    expect(csv).toContain('8');
  });

  it('escapes fields with commas', () => {
    const session = {
      ...strengthSession,
      setLogs: [{ ...strengthSession.setLogs![0], plannedWeight: '10,5kg' }],
    };
    const csv = exportSessionToCSV(session);
    expect(csv).toContain('"10,5kg"');
  });

  it('exports cardio session', () => {
    const csv = exportSessionToCSV(cardioSession);
    expect(csv).toContain('activity');
    expect(csv).toContain('爬坡跑步机');
  });
});

describe('exportSessionToJSON', () => {
  it('exports valid JSON', () => {
    const json = exportSessionToJSON(strengthSession);
    const parsed = JSON.parse(json);
    expect(parsed.dayName).toBe('力量A');
  });
});

describe('exportAllSessionsToCSV', () => {
  it('exports multiple sessions', () => {
    const csv = exportAllSessionsToCSV([strengthSession]);
    expect(csv.split('\n').length).toBeGreaterThanOrEqual(1);
  });
});

describe('exportAllSessionsToJSON', () => {
  it('exports array of sessions', () => {
    const json = exportAllSessionsToJSON([strengthSession]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/domain/exporters.test.ts
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/domain/exporters.ts src/domain/exporters.test.ts && git commit -m "feat: add csv/json export module"
```

---

### Task 10: 提示模块

**Files:**
- Create: `src/domain/hints.ts`
- Create: `src/domain/hints.test.ts`

- [ ] **Step 1: 创建 `src/domain/hints.ts`**

```typescript
import type { WorkoutSession, SetLog } from '../types';

function parseRepsUpper(reps: string): number | null {
  const match = reps.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return parseInt(match[2], 10);
  const single = reps.match(/^(\d+)/);
  if (single) return parseInt(single[1], 10);
  return null;
}

export function generateHints(session: WorkoutSession, history: WorkoutSession[]): string[] {
  const hints: string[] = [];

  if (!session.setLogs || session.setLogs.length === 0) return hints;

  const recentTopSets = new Map<string, SetLog[]>();

  for (const s of history) {
    if (!s.setLogs) continue;
    for (const log of s.setLogs) {
      if (log.setKind !== 'top') continue;
      const key = log.exerciseId;
      const list = recentTopSets.get(key) || [];
      list.push(log);
      recentTopSets.set(key, list);
    }
  }

  for (const log of session.setLogs) {
    if (log.setKind !== 'top') continue;

    const allTops = recentTopSets.get(log.exerciseId) || [];
    const latestTwo = allTops.slice(-2);

    if (latestTwo.length < 2) continue;

    const targetUpper = parseRepsUpper(log.targetReps);
    if (targetUpper === null) continue;

    const bothHit = latestTwo.every(l => l.actualReps >= targetUpper);
    if (bothHit) {
      hints.push(`${log.exerciseName}：最近两次顶组都达到目标上限，可考虑小幅加重量或降低辅助。`);
    }
  }

  return hints;
}
```

- [ ] **Step 2: 创建 `src/domain/hints.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { generateHints } from './hints';
import type { WorkoutSession, SetLog } from '../types';

function makeTopLog(exerciseId: string, exerciseName: string, targetReps: string, actualReps: number): SetLog {
  return {
    sessionId: 's1', dayId: 'a', dayName: 'A', exerciseId, exerciseName,
    setIndex: 1, setKind: 'top', plannedWeight: '10kg', targetReps,
    actualReps, plannedRestSeconds: 180, actualRestSeconds: 170,
    completedAt: '2026-05-17T10:00:00+08:00',
  };
}

function makeSession(setLogs: SetLog[]): WorkoutSession {
  return {
    sessionId: 's1', planName: 'P', planVersion: 1, dayId: 'a', dayName: 'A',
    startedAt: '2026-05-17T10:00:00+08:00', setLogs,
  };
}

describe('generateHints', () => {
  it('returns hint when recent two top sets hit upper bound', () => {
    const history = [
      makeSession([makeTopLog('bench', '卧推', '6-8', 8)]),
      makeSession([makeTopLog('bench', '卧推', '6-8', 8)]),
    ];
    const session = makeSession([makeTopLog('bench', '卧推', '6-8', 9)]);
    const hints = generateHints(session, history);
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0]).toContain('卧推');
    expect(hints[0]).toContain('加重量');
  });

  it('returns no hint when top sets did not hit upper bound', () => {
    const history = [
      makeSession([makeTopLog('bench', '卧推', '6-8', 7)]),
      makeSession([makeTopLog('bench', '卧推', '6-8', 7)]),
    ];
    const session = makeSession([makeTopLog('bench', '卧推', '6-8', 7)]);
    const hints = generateHints(session, history);
    expect(hints).toHaveLength(0);
  });

  it('returns no hint for non-top sets', () => {
    const log: SetLog = {
      ...makeTopLog('bench', '卧推', '6-8', 8),
      setKind: 'working',
    };
    const session = makeSession([log]);
    const hints = generateHints(session, []);
    expect(hints).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/domain/hints.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/domain/hints.ts src/domain/hints.test.ts && git commit -m "feat: add progression hints based on top set history"
```

---

### Task 11: App 外壳与路由

**Files:**
- Create: `src/components/App.tsx`

- [ ] **Step 1: 创建 `src/components/App.tsx`**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import type { AppState, Screen, TrainingPlan, WorkoutSession, WorkoutState } from '../types';
import { savePlan, getPlan, getSessions, saveSession, getIncompleteWorkout, deleteIncompleteWorkout } from '../storage/db';
import { validatePlan } from '../domain/planSchema';
import { migrateEnglishPlan, needsMigration } from '../domain/planMigration';
import HomeScreen from './HomeScreen';
import WorkoutScreen from './WorkoutScreen';
import CardioScreen from './CardioScreen';
import SummaryScreen from './SummaryScreen';
import HistoryScreen from './HistoryScreen';
import samplePlan from '../samplePlans/currentTrainingPlan.json';

export default function App() {
  const [state, setState] = useState<AppState>({
    screen: 'home',
    plan: null,
    workoutState: null,
    completedSession: null,
    sessions: [],
  });

  useEffect(() => {
    (async () => {
      const [plan, sessions, incomplete] = await Promise.all([
        getPlan(),
        getSessions(),
        getIncompleteWorkout(),
      ]);
      setState(s => ({ ...s, plan, sessions }));
      if (incomplete) {
        const resume = confirm('检测到未完成训练，是否继续？');
        if (resume) {
          setState(s => ({ ...s, screen: 'workout', workoutState: incomplete }));
        } else {
          const savePartial = confirm('是否保存已完成组并结束？');
          if (savePartial && incomplete.completedSetLogs.length > 0) {
            await saveSession({
              ...incomplete.session,
              finishedAt: new Date().toISOString(),
              setLogs: incomplete.completedSetLogs,
            });
          }
          await deleteIncompleteWorkout();
          const sessions = await getSessions();
          setState(s => ({ ...s, sessions }));
        }
      }
    })();
  }, []);

  const handleImportPlan = useCallback(async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const result = validatePlan(parsed);
      if (!result.valid) {
        alert(result.errors.map(e => `${e.path}: ${e.message}`).join('\n'));
        return;
      }
      let plan = result.plan!;
      if (needsMigration(plan)) {
        plan = migrateEnglishPlan(plan);
      }
      await savePlan(plan);
      setState(s => ({ ...s, plan }));
    } catch {
      alert('JSON 解析失败，请检查格式。');
    }
  }, []);

  const handleLoadSamplePlan = useCallback(async () => {
    const result = validatePlan(samplePlan);
    if (result.valid && result.plan) {
      await savePlan(result.plan);
      setState(s => ({ ...s, plan: result.plan! }));
    }
  }, []);

  const handleStartWorkout = useCallback((workoutState: WorkoutState) => {
    setState(s => ({ ...s, screen: 'workout', workoutState }));
  }, []);

  const handleStartCardio = useCallback((workoutState: WorkoutState) => {
    setState(s => ({ ...s, screen: 'cardio', workoutState }));
  }, []);

  const handleWorkoutComplete = useCallback(async (session: WorkoutSession) => {
    await saveSession(session);
    await deleteIncompleteWorkout();
    const sessions = await getSessions();
    setState(s => ({
      ...s,
      screen: 'summary',
      completedSession: session,
      workoutState: null,
      sessions,
    }));
  }, []);

  const handleGoHome = useCallback(() => {
    setState(s => ({ ...s, screen: 'home', completedSession: null, workoutState: null }));
  }, []);

  const handleGoHistory = useCallback(async () => {
    const sessions = await getSessions();
    setState(s => ({ ...s, screen: 'history', sessions }));
  }, []);

  const renderScreen = () => {
    switch (state.screen) {
      case 'home':
        return (
          <HomeScreen
            plan={state.plan}
            sessions={state.sessions}
            onImportPlan={handleImportPlan}
            onLoadSamplePlan={handleLoadSamplePlan}
            onStartWorkout={handleStartWorkout}
            onStartCardio={handleStartCardio}
            onGoHistory={handleGoHistory}
          />
        );
      case 'workout':
        return state.workoutState ? (
          <WorkoutScreen
            workoutState={state.workoutState}
            onUpdateState={ws => setState(s => ({ ...s, workoutState: ws }))}
            onComplete={handleWorkoutComplete}
          />
        ) : null;
      case 'cardio':
        return state.workoutState ? (
          <CardioScreen
            workoutState={state.workoutState}
            onComplete={handleWorkoutComplete}
          />
        ) : null;
      case 'summary':
        return state.completedSession ? (
          <SummaryScreen
            session={state.completedSession}
            sessions={state.sessions}
            onGoHome={handleGoHome}
          />
        ) : null;
      case 'history':
        return (
          <HistoryScreen
            sessions={state.sessions}
            onGoHome={handleGoHome}
            onSessionsChange={async () => {
              const sessions = await getSessions();
              setState(s => ({ ...s, sessions }));
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', minHeight: '100dvh' }}>
      {renderScreen()}
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```
Expected: 会有对尚未创建的组件的引用报错 — 这是预期行为（Task 12-16 会创建）。

- [ ] **Step 3: Commit**

```bash
git add src/components/App.tsx && git commit -m "feat: add app shell with screen routing and state management"
```

---

### Task 12: 首页组件

**Files:**
- Create: `src/components/HomeScreen.tsx`

- [ ] **Step 1: 创建 `src/components/HomeScreen.tsx`**

```typescript
import React, { useRef } from 'react';
import type { TrainingPlan, WorkoutSession, WorkoutState } from '../types';
import { startWorkout } from '../domain/workoutRunner';

interface Props {
  plan: TrainingPlan | null;
  sessions: WorkoutSession[];
  onImportPlan: (jsonStr: string) => void;
  onLoadSamplePlan: () => void;
  onStartWorkout: (state: WorkoutState) => void;
  onStartCardio: (state: WorkoutState) => void;
  onGoHistory: () => void;
}

export default function HomeScreen({
  plan, sessions, onImportPlan, onLoadSamplePlan,
  onStartWorkout, onStartCardio, onGoHistory,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportPlan(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDayClick = (day: typeof plan.days[0]) => {
    if (!plan) return;
    const state = startWorkout(plan, day);
    const isCardio = day.blocks.length === 1 && day.blocks[0].sets.every(s => s.kind === 'cardio');
    if (isCardio) {
      onStartCardio(state);
    } else {
      onStartWorkout(state);
    }
  };

  const lastSession = sessions.length > 0 ? sessions[0] : null;

  return (
    <div>
      <h1 style={{ fontSize: '24px', textAlign: 'center', marginBottom: 4 }}>训练助手</h1>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 20, fontSize: '14px' }}>离线训练记录</p>

      {!plan ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ marginBottom: 16, color: '#aaa' }}>还没有训练计划，请先导入或加载示例计划</p>
          <button onClick={() => fileRef.current?.click()} style={btnPrimary}>
            导入训练计划 JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ marginTop: 12 }}>
            <button onClick={onLoadSamplePlan} style={btnSecondary}>
              加载示例计划
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{plan.planName}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>版本 {plan.version}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {plan.days.map(day => (
              <button
                key={day.id}
                onClick={() => handleDayClick(day)}
                style={{
                  ...btnTrainingDay,
                  display: 'block',
                  width: '100%',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{day.name}</div>
                {day.focus && <div style={{ fontSize: '12px', color: '#aaa', marginTop: 2 }}>{day.focus}</div>}
              </button>
            ))}
          </div>

          {lastSession && (
            <div style={{
              background: '#16213e',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 4 }}>最近训练</div>
              <div>{lastSession.dayName} — {new Date(lastSession.startedAt).toLocaleDateString('zh-CN')}</div>
              {lastSession.setLogs && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                  完成 {lastSession.setLogs.length} 组
                </div>
              )}
              {lastSession.cardioLog && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                  {lastSession.cardioLog.activity} · {lastSession.cardioLog.actualDurationMinutes}分钟
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={onGoHistory} style={btnSecondary}>
              训练历史
            </button>
            <button onClick={() => fileRef.current?.click()} style={btnSecondary}>
              导入新计划
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
        </>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: 8,
  fontSize: '16px',
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: '#0f3460',
  fontWeight: 400,
  fontSize: '14px',
  padding: '8px 16px',
};

const btnTrainingDay: React.CSSProperties = {
  ...btnPrimary,
  background: '#16213e',
  textAlign: 'left',
  fontWeight: 400,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HomeScreen.tsx && git commit -m "feat: add home screen with plan display and day selection"
```

---

### Task 13: 力量训练页

**Files:**
- Create: `src/components/WorkoutScreen.tsx`

- [ ] **Step 1: 创建 `src/components/WorkoutScreen.tsx`**

```typescript
import React, { useState, useEffect, useRef } from 'react';
import type { WorkoutState, WorkoutSession } from '../types';
import {
  completeSet, startNextSet, getRemainingRestSeconds,
  updateActualReps, SET_KIND_LABELS,
} from '../domain/workoutRunner';
import { saveIncompleteWorkout, deleteIncompleteWorkout } from '../storage/db';
import { notifyRestComplete } from '../reminders/reminder';

interface Props {
  workoutState: WorkoutState;
  onUpdateState: (state: WorkoutState) => void;
  onComplete: (session: WorkoutSession) => void;
}

export default function WorkoutScreen({ workoutState, onUpdateState, onComplete }: Props) {
  const [restSeconds, setRestSeconds] = useState(0);
  const [restNotified, setRestNotified] = useState(false);
  const [repInput, setRepInput] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);

  const current = workoutState.flatSets[workoutState.currentFlatIndex];
  const isLastSet = workoutState.currentFlatIndex >= workoutState.flatSets.length - 1;

  useEffect(() => {
    if (workoutState.phase === 'rest') {
      setRestNotified(false);
      setRestSeconds(getRemainingRestSeconds(workoutState));

      timerRef.current = setInterval(() => {
        const remaining = getRemainingRestSeconds(workoutState);
        setRestSeconds(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!restNotified) {
            setRestNotified(true);
            notifyRestComplete();
          }
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

  const handleCompleteSet = () => {
    const reps = parseInt(repInput, 10) || 0;
    const next = completeSet(workoutState, reps);
    onUpdateState(next);
    setRepInput('');

    if (next.phase === 'completed') {
      onComplete(next.session);
    }
  };

  const handleNextSet = () => {
    const next = startNextSet(workoutState);
    onUpdateState(next);
    setRepInput('');
  };

  const handleUpdateReps = (index: number, newReps: number) => {
    const next = updateActualReps(workoutState, index, newReps);
    onUpdateState(next);
    setEditingSetIndex(null);
  };

  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        {workoutState.session.dayName}
      </div>

      {workoutState.phase === 'active' && (
        <>
          <div style={{
            background: '#16213e', borderRadius: 12, padding: 20, marginTop: 16,
          }}>
            <div style={{ fontSize: '14px', color: '#aaa' }}>当前动作</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>{current.block.name}</div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <Tag label="组别" value={`第 ${current.setIndex + 1} 组`} />
              <Tag label="类型" value={SET_KIND_LABELS[current.set.kind] || current.set.kind} />
              <Tag label="重量" value={current.set.plannedWeight} />
              <Tag label="目标" value={`${current.set.targetReps} 次`} />
            </div>

            {current.block.primaryMuscles && current.block.primaryMuscles.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {current.block.primaryMuscles.map(m => (
                  <span key={m} style={{
                    background: '#e94560', color: '#fff', padding: '2px 8px',
                    borderRadius: 4, fontSize: '12px',
                  }}>{m}</span>
                ))}
                {current.block.secondaryMuscles?.map(m => (
                  <span key={m} style={{
                    background: '#0f3460', color: '#ccc', padding: '2px 8px',
                    borderRadius: 4, fontSize: '12px',
                  }}>{m}</span>
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

          {restSeconds <= 0 && (
            <div style={{ marginTop: 20 }}>
              <button onClick={handleNextSet} style={btnPrimary}>
                开始下一组
              </button>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <label style={{ fontSize: '14px', color: '#aaa' }}>实际次数</label>
            <input
              type="number"
              inputMode="numeric"
              value={repInput}
              onChange={e => setRepInput(e.target.value)}
              placeholder="输入实际次数"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {workoutState.completedSetLogs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 8 }}>已完成组</div>
          {workoutState.completedSetLogs.map((log, i) => (
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
                {editingSetIndex === i ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={log.actualReps}
                    style={{ ...inputStyle, width: 60, padding: '4px 8px' }}
                    onBlur={e => handleUpdateReps(i, parseInt(e.target.value, 10) || 0)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleUpdateReps(i, parseInt((e.target as HTMLInputElement).value, 10) || 0);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    style={{ fontSize: '14px', color: '#e94560', cursor: 'pointer' }}
                    onClick={() => setEditingSetIndex(i)}
                  >
                    {log.actualReps}次
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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

- [ ] **Step 2: Commit**

```bash
git add src/components/WorkoutScreen.tsx && git commit -m "feat: add strength workout screen with rest timer and rep editing"
```

---

### Task 14: 有氧页

**Files:**
- Create: `src/components/CardioScreen.tsx`

- [ ] **Step 1: 创建 `src/components/CardioScreen.tsx`**

```typescript
import React, { useState } from 'react';
import type { WorkoutState, WorkoutSession, CardioLog } from '../types';

interface Props {
  workoutState: WorkoutState;
  onComplete: (session: WorkoutSession) => void;
}

export default function CardioScreen({ workoutState, onComplete }: Props) {
  const block = workoutState.flatSets[0]?.block;
  const set = workoutState.flatSets[0]?.set;

  const [duration, setDuration] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    const now = new Date();

    const cardioLog: CardioLog = {
      sessionId: workoutState.session.sessionId,
      dayId: workoutState.session.dayId,
      dayName: workoutState.session.dayName,
      activity: block?.name || '',
      targetDurationMinutes: set?.targetReps || '',
      targetHeartRate: set?.plannedWeight || '',
      actualDurationMinutes: parseInt(duration, 10) || 0,
      actualHeartRate: heartRate || '',
      notes: notes || '',
      completedAt: now.toISOString(),
    };

    const session: WorkoutSession = {
      ...workoutState.session,
      finishedAt: now.toISOString(),
      cardioLog,
    };

    onComplete(session);
  };

  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        {workoutState.session.dayName}
      </div>

      <div style={{
        background: '#16213e', borderRadius: 12, padding: 20, marginTop: 16,
      }}>
        <div style={{ fontSize: '14px', color: '#aaa' }}>有氧项目</div>
        <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>{block?.name}</div>

        {block?.notes && (
          <div style={{ marginTop: 12, fontSize: '13px', color: '#888' }}>
            备注：{block.notes}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#888' }}>目标时长：</span>
            <span style={{ fontSize: '13px' }}>{set?.targetReps}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#888' }}>目标心率：</span>
            <span style={{ fontSize: '13px' }}>{set?.plannedWeight}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={labelStyle}>实际时长（分钟）</label>
        <input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="输入实际时长"
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>心率范围</label>
        <input
          type="text"
          value={heartRate}
          onChange={e => setHeartRate(e.target.value)}
          placeholder="例如 132-142"
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>备注</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="训练感受..."
          style={{ ...inputStyle, height: 80, resize: 'vertical' }}
        />
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={handleComplete} style={btnPrimary}>
          完成有氧
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  color: '#aaa',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#16213e',
  color: '#fff',
  fontSize: '16px',
  width: '100%',
  maxWidth: 300,
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CardioScreen.tsx && git commit -m "feat: add cardio training screen"
```

---

### Task 15: 总结页

**Files:**
- Create: `src/components/SummaryScreen.tsx`

- [ ] **Step 1: 创建 `src/components/SummaryScreen.tsx`**

```typescript
import React from 'react';
import type { WorkoutSession } from '../types';
import { SET_KIND_LABELS } from '../domain/workoutRunner';
import { exportSessionToCSV, exportSessionToJSON, downloadFile } from '../domain/exporters';
import { generateHints } from '../domain/hints';

interface Props {
  session: WorkoutSession;
  sessions: WorkoutSession[];
  onGoHome: () => void;
}

export default function SummaryScreen({ session, sessions, onGoHome }: Props) {
  const hints = generateHints(session, sessions);

  const handleExportCSV = () => {
    const csv = exportSessionToCSV(session);
    const filename = `训练记录-${session.dayName}-${new Date(session.startedAt).toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    const json = exportSessionToJSON(session);
    const filename = `训练记录-${session.dayName}-${new Date(session.startedAt).toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json;charset=utf-8');
  };

  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        训练完成
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: '14px', marginBottom: 20 }}>
        {session.dayName} · {new Date(session.startedAt).toLocaleString('zh-CN')}
      </div>

      {session.setLogs && session.setLogs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 8 }}>训练详情</div>
          {session.setLogs.map((log, i) => (
            <div key={i} style={{
              background: '#16213e', borderRadius: 8, padding: '8px 12px',
              marginBottom: 4, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: '13px' }}>{log.exerciseName}</span>
                <span style={{ fontSize: '12px', color: '#888', marginLeft: 8 }}>
                  第{log.setIndex}组 · {SET_KIND_LABELS[log.setKind]}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#e94560' }}>{log.actualReps}次</div>
            </div>
          ))}
        </div>
      )}

      {session.cardioLog && (
        <div style={{
          background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 20,
        }}>
          <div style={{ fontSize: '14px' }}>{session.cardioLog.activity}</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: 4 }}>
            实际时长：{session.cardioLog.actualDurationMinutes}分钟
          </div>
          {session.cardioLog.actualHeartRate && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              心率范围：{session.cardioLog.actualHeartRate}
            </div>
          )}
          {session.cardioLog.notes && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              备注：{session.cardioLog.notes}
            </div>
          )}
        </div>
      )}

      {hints.length > 0 && (
        <div style={{
          background: '#0f3460', borderRadius: 8, padding: 12, marginBottom: 20,
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 6 }}>进阶提示</div>
          {hints.map((hint, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: 4 }}>{hint}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handleExportCSV} style={btnSecondary}>导出 CSV</button>
        <button onClick={handleExportJSON} style={btnSecondary}>导出 JSON</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button onClick={onGoHome} style={btnPrimary}>返回首页</button>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: 8,
  fontSize: '16px',
  fontWeight: 600,
  width: '100%',
  maxWidth: 280,
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: '#0f3460',
  fontWeight: 400,
  fontSize: '14px',
  padding: '8px 16px',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SummaryScreen.tsx && git commit -m "feat: add post-workout summary with hints and export"
```

---

### Task 16: 历史页

**Files:**
- Create: `src/components/HistoryScreen.tsx`

- [ ] **Step 1: 创建 `src/components/HistoryScreen.tsx`**

```typescript
import React from 'react';
import type { WorkoutSession } from '../types';
import { exportAllSessionsToCSV, exportAllSessionsToJSON, downloadFile } from '../domain/exporters';
import { clearAll, getSessions } from '../storage/db';

interface Props {
  sessions: WorkoutSession[];
  onGoHome: () => void;
  onSessionsChange: () => void;
}

export default function HistoryScreen({ sessions, onGoHome, onSessionsChange }: Props) {
  const handleExportAllCSV = () => {
    const csv = exportAllSessionsToCSV(sessions);
    const filename = `全部训练记录-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportAllJSON = () => {
    const json = exportAllSessionsToJSON(sessions);
    const filename = `全部训练记录-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json;charset=utf-8');
  };

  const handleClear = async () => {
    const confirmed = confirm('确认清空所有本地数据？此操作不可恢复。');
    if (!confirmed) return;
    const doubleConfirm = confirm('再次确认：清空所有训练计划、历史记录和未完成训练？');
    if (!doubleConfirm) return;
    await clearAll();
    onSessionsChange();
    onGoHome();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onGoHome} style={{ background: 'none', color: '#e94560', fontSize: '14px' }}>
          ← 返回
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>训练历史</div>
        <div style={{ width: 50 }} />
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          暂无训练记录
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {sessions.map(session => (
            <div key={session.sessionId} style={{
              background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{session.dayName}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                    {new Date(session.startedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#aaa' }}>
                  {session.setLogs && `完成 ${session.setLogs.length} 组`}
                  {session.cardioLog && `${session.cardioLog.activity} · ${session.cardioLog.actualDurationMinutes}分钟`}
                </div>
              </div>
              {session.cardioLog?.actualHeartRate && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
                  心率：{session.cardioLog.actualHeartRate}
                  {session.cardioLog.notes && ` · ${session.cardioLog.notes}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={handleExportAllCSV} style={btnSecondary}>导出全部 CSV</button>
          <button onClick={handleExportAllJSON} style={btnSecondary}>导出全部 JSON</button>
          <button onClick={handleClear} style={btnDanger}>清空数据</button>
        </div>
      )}
    </div>
  );
}

const btnSecondary: React.CSSProperties = {
  background: '#0f3460',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: '14px',
  border: 'none',
};

const btnDanger: React.CSSProperties = {
  ...btnSecondary,
  background: '#333',
  color: '#e94560',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HistoryScreen.tsx && git commit -m "feat: add training history screen with bulk export and clear"
```

---

### Task 17: PWA 图标与配置

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

vite-plugin-pwa 已通过 PWA 插件集成了 service worker 生成（Task 1 中配置了 VitePWA + workbox）。此任务只需生成图标文件。

- [ ] **Step 1: 生成 PWA 图标**

使用内联 SVG 转 PNG 的方式生成简单图标：

```bash
cat << 'SVG' > /tmp/icon.svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#1a1a2e"/>
  <text x="256" y="320" font-size="320" text-anchor="middle" fill="#e94560" font-family="sans-serif" font-weight="bold">T</text>
</svg>
SVG
```

然后运行以下 Node 脚本生成 PNG（需要 canvas）：

```bash
# 如果没有 svg-to-png 工具，用简单的办法生成占位图标
# 通过 imagemagick 如果可用，或创建简单的 base64 占位
```

如果 macOS 上没有 ImageMagick，使用以下 Node 脚本：

```bash
cat << 'NODESCRIPT' > /tmp/gen-icons.mjs
import { writeFileSync } from 'fs';

// 1x1 像素 PNG（最小合法 PNG）
const png192 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAANklEQVQoz2P4z8BQz0ABYKSfAgYKAOMA5Q3Z2dmDh4YhD+U5tLS0DD58+PAnAwMDI5BmBABWLBXgZGKSEAAAAABJRU5ErkJggg==',
  'base64'
);

// 用 npx 生成更大的图标 - 简单基于 canvas 生成
// 此处用占位方式，实际应该用 canvas 库
console.log('Creating placeholder icons...');
writeFileSync('public/icon-192.png', png192);
writeFileSync('public/icon-512.png', png192);
console.log('Done');
NODESCRIPT

mkdir -p public
node /tmp/gen-icons.mjs
```

或者更简单的方式，用内置的 `canvas` package：

```bash
mkdir -p public
npm install -D canvas
node -e "
const { createCanvas } = require('canvas');
[192, 512].forEach(size => {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold ' + (size * 0.55) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('练', size/2, size/2);
  require('fs').writeFileSync('public/icon-' + size + '.png', c.toBuffer('image/png'));
});
"
```

- [ ] **Step 2: Commit**

```bash
git add public/icon-192.png public/icon-512.png && git commit -m "feat: add pwa icons"
```

---

### Task 18: 样式打磨与响应式

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 更新 `src/index.css` 增加手机端样式**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-user-select: none;
  user-select: none;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', 'Helvetica Neue', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100dvh;
  overflow-x: hidden;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

button:active {
  opacity: 0.8;
  transform: scale(0.98);
}

input, textarea {
  font-family: inherit;
  font-size: 16px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
}

input:focus, textarea:focus {
  border-color: #e94560 !important;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.rest-complete-animation {
  animation: pulse 1s ease-in-out 3;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css && git commit -m "style: add mobile-friendly styles and chinese font stack"
```

---

### Task 19: 最终集成验证

**Files:**
- Modify: `package.json`（添加 scripts）
- Create: `vitest.config.ts`（如需要）

- [ ] **Step 1: 更新 `package.json` 添加 scripts**

确认 `package.json` 包含以下 scripts：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: 运行全部测试**

```bash
npx vitest run
```
Expected: 所有测试通过（约 25+ tests）。

- [ ] **Step 3: 运行 TypeScript 编译检查**

```bash
npx tsc --noEmit
```
Expected: 无类型错误。

- [ ] **Step 4: 构建生产版本**

```bash
npx vite build
```
Expected: 构建成功，在 `dist/` 目录输出生产文件，包括 service worker。

- [ ] **Step 5: 启动预览服务器验证**

```bash
npx vite preview --host
```
Expected: 在浏览器打开，验证：
1. 首页显示"训练助手"和"还没有训练计划"
2. 点击"加载示例计划"后显示 4 个训练日
3. 点击"力量A"进入训练页，显示动作信息和"完成本组"按钮
4. 点击"完成本组"进入休息倒计时
5. 倒计时结束后显示"休息完成"和"开始下一组"
6. 最后一组完成后显示"完成训练"按钮
7. 完成训练后跳转总结页
8. 历史页可以查看和导出
9. 有氧训练页可以输入时长心率并完成

- [ ] **Step 6: 最终 Commit**

```bash
git add -A && git commit -m "feat: complete fitness training pwa with all screens and features"
```

---

## 架构总结

```
src/
├── types.ts                          # 所有 TypeScript 类型定义
├── main.tsx                          # 应用入口
├── index.css                         # 全局样式
├── components/
│   ├── App.tsx                       # 路由与状态管理
│   ├── HomeScreen.tsx                # 首页
│   ├── WorkoutScreen.tsx             # 力量训练页
│   ├── CardioScreen.tsx              # 有氧页
│   ├── SummaryScreen.tsx             # 训练总结页
│   └── HistoryScreen.tsx             # 历史页
├── domain/
│   ├── planSchema.ts                 # 计划 JSON 校验
│   ├── planMigration.ts              # 旧版英文计划迁移
│   ├── workoutRunner.ts              # 训练执行状态机
│   ├── exporters.ts                  # CSV/JSON 导出
│   └── hints.ts                      # 进阶提示生成
├── storage/
│   └── db.ts                         # IndexedDB 操作封装
├── reminders/
│   └── reminder.ts                   # 声音 + 震动提醒
└── samplePlans/
    └── currentTrainingPlan.json      # 内置示例训练计划
```

## 数据流

```
JSON 文件/示例计划
  → planSchema.validatePlan()
  → [needsMigration? → planMigration.migrateEnglishPlan()]
  → db.savePlan()
  → HomeScreen 展示训练日
  → workoutRunner.startWorkout()
  → WorkoutScreen/CardioScreen 交互
    → workoutRunner.completeSet() / startNextSet()
    → reminder.notifyRestComplete()
    → db.saveIncompleteWorkout()
  → db.saveSession()
  → SummaryScreen 展示 + hints.generateHints()
  → exporters.downloadFile()
```
