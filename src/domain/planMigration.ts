import type { TrainingPlan, TrainingSet, Block, ExerciseBlock } from '../types';

const ENGLISH_SET_KIND_MAP: Record<string, string> = {
  'top set': 'top',
  'backoff set': 'backoff',
  'working set': 'working',
  'accessory': 'accessory',
  'cardio': 'cardio',
};

function migrateBlock(block: Block): Block {
  if ('options' in block) {
    return {
      ...block,
      options: block.options.map(opt => ({
        ...opt,
        sets: migrateSets(opt.sets),
      })),
    };
  }
  return {
    ...block,
    sets: migrateSets(block.sets),
  };
}

function migrateSets(sets: TrainingSet[]): TrainingSet[] {
  return sets.map(set => {
    const englishKind = set.kind.toLowerCase();
    const mapped = ENGLISH_SET_KIND_MAP[englishKind];
    const kind = mapped || set.kind;

    let { plannedWeight } = set;
    if (plannedWeight.toLowerCase().includes('kg each side')) {
      plannedWeight = plannedWeight.replace(/kg each side/i, 'kg');
      plannedWeight = `两边各${plannedWeight}`;
    }
    if (plannedWeight.toLowerCase().includes('each side')) {
      plannedWeight = plannedWeight.replace(/each side/i, '').trim();
      plannedWeight = `两边各${plannedWeight}`;
    }

    return { ...set, kind: kind as TrainingSet['kind'], plannedWeight };
  });
}

export function migrateEnglishPlan(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    days: plan.days.map(day => ({
      ...day,
      blocks: day.blocks.map(block => migrateBlock(block)),
    })),
  };
}

function blockHasEnglishSetKind(block: Block): boolean {
  if ('options' in block) {
    return block.options.some(opt => opt.sets.some(set => {
      const lower = set.kind.toLowerCase();
      return Object.keys(ENGLISH_SET_KIND_MAP).includes(lower) && ENGLISH_SET_KIND_MAP[lower] !== lower;
    }));
  }
  return block.sets.some(set => {
    const lower = set.kind.toLowerCase();
    return Object.keys(ENGLISH_SET_KIND_MAP).includes(lower) && ENGLISH_SET_KIND_MAP[lower] !== lower;
  });
}

export function needsMigration(plan: TrainingPlan): boolean {
  return plan.days.some(day =>
    day.blocks.some(block => blockHasEnglishSetKind(block))
  );
}
