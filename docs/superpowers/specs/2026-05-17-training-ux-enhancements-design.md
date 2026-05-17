# 训练体验增强 — 设计文档

**日期:** 2026-05-17
**状态:** 待审核

## 目标

三项增强，让训练执行更灵活：

1. **训练中自由选择动作顺序** — 不再锁定计划顺序，完成当前动作后从待完成列表中选择下一个
2. **备选动作** — 计划中预设多个选项（如"高位下拉 / 辅助引体"），训练时选择执行哪个
3. **计划编辑器** — 在应用内可视化编辑 `plannedWeight` 和 `targetReps`，导出修改后的 JSON

---

## 1. 训练自由选动作

### 当前行为

`flattenSets()` 将所有 block 内所有 set 展平为一个线性数组。`currentFlatIndex` 按序移动，不支持跳转。

### 目标行为

- 以 block 为单位执行：选中一个 block 后，其内部 sets 按序执行
- 当前 block 所有 set 完成后，显示待完成动作列表
- 用户从列表中点击选择下一个要做的 block，然后按序执行其 sets
- 所有 block 完成后训练结束

### 实现

`WorkoutState` 结构：

```typescript
export interface WorkoutState {
  session: WorkoutSession;
  currentBlockIndex: number | null;   // 当前正在执行的 block，null=待选择
  flatSets: FlatSet[];                 // 当前 block 的展平 sets
  currentFlatIndex: number;            // 当前 block 内的位置
  remainingBlockIndices: number[];     // 尚未执行的 block 索引列表
  phase: WorkoutPhase;
  restStartedAt: string | null;
  restEndsAt: string | null;
  completedSetLogs: SetLog[];
  selectedExerciseIds: Record<number, string>; // OptionBlock 选中的 exerciseId
}
```

`workoutRunner.ts` 新增/修改函数：

- `selectBlock(state, blockIndex)` — 选中一个 block，展开其 sets
- `completeSet()` — 不变，block 内逻辑相同
- `startNextSet()` — 如果当前 block 完成，将 `currentBlockIndex` 设为 null（待选择）；否则推进 block 内索引
- `isWorkoutComplete(state)` — 所有 block 执行完毕

### 待完成列表 UI

WorkoutScreen 在 `currentBlockIndex === null` 时渲染：
- 卡片列表，每个卡片显示：动作名称、组类型标签、重量、目标次数
- 已完成的 block 灰显或隐藏
- 点击选中后进入执行

---

## 2. 备选动作

### 数据模型

`src/types.ts` 新增 `OptionBlock`：

```typescript
export interface OptionBlock {
  kind: 'option';
  id: string;
  name: string;
  options: ExerciseBlock[];
}
```

`TrainingDay.blocks` 类型改为 `(ExerciseBlock | OptionBlock)[]`。

### JSON 格式

```json
{
  "id": "back-exercise",
  "name": "背部动作",
  "kind": "option",
  "options": [
    {
      "exerciseId": "lat-pulldown",
      "name": "高位下拉",
      "primaryMuscles": ["背阔肌"],
      "sets": [
        { "kind": "working", "plannedWeight": "26kg", "targetReps": "8-10", "restSeconds": 120 }
      ]
    },
    {
      "exerciseId": "assisted-pullup",
      "name": "辅助引体",
      "primaryMuscles": ["背阔肌"],
      "sets": [
        { "kind": "working", "plannedWeight": "辅助33kg", "targetReps": "8-10", "restSeconds": 120 }
      ]
    }
  ]
}
```

约束：`options` 数组中所有 `ExerciseBlock` 的 `sets.length` 必须一致，训练时校验（保证选哪个备选项的组数都一样）。

### UI 流程

1. 训练开始或选择到一个 `OptionBlock` 时，弹出模态选择器
2. 选择器列出所有 `options`，显示名称、重量、目标次数、肌群标签
3. 用户选择一个后，`OptionBlock` 被解析为选中的 `ExerciseBlock`，加入待完成列表
4. `selectedExerciseIds` 记录选择结果，用于后续记录导出

### 计划校验适配

`planSchema.ts` 的 `validatePlan()` 需处理 blocks 数组中同时存在 `ExerciseBlock` 和 `OptionBlock`：
- `OptionBlock`: 校验 `id`、`name`、`kind === 'option'`、`options` 为非空数组
- `options` 内的每个 `ExerciseBlock` 同样走现有 sets 校验
- `options` 之间 `sets.length` 必须相同

---

## 3. 计划编辑器

### 定位

- PWA 内新增页面
- 专注编辑 `plannedWeight` 和 `targetReps`
- 其他字段只读展示提供上下文（动作名、组类型、备注）
- 编辑完成后导出 JSON 文件下载

### UI 结构

```
┌─────────────────────────────┐
│ ← 返回   训练计划编辑器       │
├─────────────────────────────┤
│ [力量A] [力量B] [力量C] [有氧]│  ← Tab 切换训练日
├─────────────────────────────┤
│ 史密斯卧推 — 顶组            │
│ 重量 [两边各10kg          ]  │  ← 可编辑
│ 次数 [6-8                 ]  │  ← 可编辑
│ 休息  180秒                 │
├─────────────────────────────┤
│ 史密斯卧推 — 降重组           │
│ 重量 [两边各7.5kg         ]  │
│ 次数 [8-10                ]  │
├─────────────────────────────┤
│ ...                         │
├─────────────────────────────┤
│         [导出 JSON]          │
└─────────────────────────────┘
```

### 数据流

```
当前计划（IndexedDB）
  → Editor 读取并展示为表单
  → 用户编辑 weight 和 reps
  → 修改反映在内存中的 plan 对象
  → 点击"导出 JSON" → downloadFile(JSON.stringify(plan), '训练计划-修改.json')
```

- 不直接覆盖 IndexedDB 中的计划（避免改坏）
- 导出后用户可重新导入确认

### 入口

首页已有"导入计划"和"加载示例计划"按钮，在旁边加"编辑计划"按钮。仅在有计划时显示。

---

## 文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types.ts` | 修改 | 加 `OptionBlock`，`blocks` 类型改为 union |
| `src/domain/planSchema.ts` | 修改 | 校验适配新 block 类型 |
| `src/domain/workoutRunner.ts` | 修改 | block 级跳转执行模型 |
| `src/components/WorkoutScreen.tsx` | 修改 | 加待完成列表 + 备选选择器 |
| `src/components/PlanEditor.tsx` | 新建 | 计划编辑器 |
| `src/components/App.tsx` | 修改 | 加 editor screen 路由和入口 |
| `src/components/HomeScreen.tsx` | 修改 | 加"编辑计划"按钮 |

---

## 非目标

- 不在编辑器里改训练日结构（增删动作、改顺序等）
- 不在编辑器里改肌群/备注等元数据
- 不做 Markdown 转换器（确认不需要）
- 不改变有氧训练页（CardioScreen 不变）
- 不改变导出 CSV 格式（备选动作的选择信息记录在 SetLog 中正常导出）
