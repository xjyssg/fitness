import { describe, it, expect } from 'vitest';
import { validatePlan } from './domain/planSchema';
import plan from '../训练计划-8周.json';

describe('validate', () => {
  it('valid', () => {
    const r = validatePlan(plan);
    if (!r.valid) r.errors.forEach(e => console.log(e.path + ': ' + e.message));
    expect(r.valid).toBe(true);
  });
  it('A day 5 blocks', () => expect(plan.days[0].blocks.length).toBe(5));
  it('B day 5 blocks', () => expect(plan.days[1].blocks.length).toBe(5));
  it('C day 5 blocks, 2 option', () => {
    expect(plan.days[2].blocks.length).toBe(5);
    expect(plan.days[2].blocks.filter(b => 'options' in b).length).toBe(2);
  });
  it('all weights numeric', () => {
    function check(o: any) {
      if (Array.isArray(o)) o.forEach(check);
      else if (o && typeof o === 'object') {
        if (o.plannedWeight && o.plannedWeight !== '心率130-140')
          expect(o.plannedWeight).toMatch(/^\d+(\.\d+)?$/);
        Object.values(o).forEach(check);
      }
    }
    check(plan);
  });
});
