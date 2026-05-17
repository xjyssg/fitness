import { describe, it, expect } from 'vitest';
import { migrateEnglishPlan, needsMigration } from './planMigration';
import type { TrainingPlan, ExerciseBlock } from '../types';

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
    const b = result.days[0].blocks[0] as ExerciseBlock;
    expect(b.sets[0].kind).toBe('top');
  });

  it('converts each side weight format', () => {
    const result = migrateEnglishPlan(englishPlan);
    const b = result.days[0].blocks[0] as ExerciseBlock;
    expect(b.sets[0].plannedWeight).toBe('两边各10kg');
  });
});
