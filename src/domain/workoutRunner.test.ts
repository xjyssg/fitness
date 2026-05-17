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
