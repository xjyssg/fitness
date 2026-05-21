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

  it('does not remove block from remaining until block completes', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const next = selectBlock(state, 0);
    // Block 0 is still in remaining until all its sets are done
    expect(next.remainingBlockIndices).toEqual([0, 1]);
  });

  it('ignores selection when already in a block', () => {
    const state = startWorkout(samplePlan, sampleDay);
    const s1 = selectBlock(state, 0);
    const s2 = selectBlock(s1, 1);
    expect(s2.currentBlockIndex).toBe(0);
  });
});

describe('completeSet and startNextSet with block model', () => {
  it('after completing all blocks, workout completes', () => {
    const state = startWorkout(samplePlan, sampleDay);
    // Complete block 0 first
    let s = selectBlock(state, 0); // 卧推 2 sets
    s = completeSet(s, 8);   // set 0
    s = startNextSet(s);     // advance within block
    s = completeSet(s, 10);  // set 1 (last in block, not last block → directly back to selection)
    expect(s.phase).toBe('active');
    expect(s.currentBlockIndex).toBeNull();
    expect(s.remainingBlockIndices).toEqual([1]);

    // Now complete block 1 (last block)
    s = selectBlock(s, 1);   // 深蹲 1 set
    s = completeSet(s, 12);  // last set of last block
    expect(s.phase).toBe('completed');
  });

  it('completes a block and returns to pending list directly', () => {
    const state = startWorkout(samplePlan, sampleDay);
    let s = selectBlock(state, 0); // 卧推 2 sets
    s = completeSet(s, 8);          // set 0 → enters rest (not last in block)
    expect(s.phase).toBe('rest');
    expect(s.currentBlockIndex).toBe(0);

    s = startNextSet(s);            // advance to set 1
    expect(s.phase).toBe('active');
    expect(s.currentFlatIndex).toBe(1);

    s = completeSet(s, 10);         // last set in block → directly back to selection
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
