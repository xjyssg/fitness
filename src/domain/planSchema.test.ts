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
