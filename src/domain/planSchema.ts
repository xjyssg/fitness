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
