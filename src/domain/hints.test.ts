import { describe, it, expect } from 'vitest';
import { generateHints } from './hints';
import type { WorkoutSession, SetLog } from '../types';

function makeTopLog(exerciseId: string, exerciseName: string, targetReps: string, actualReps: number): SetLog {
  return {
    sessionId: 's1', dayId: 'a', dayName: 'A', exerciseId, exerciseName,
    setIndex: 1, setKind: 'top', plannedWeight: '10kg', actualWeight: '10kg', targetReps,
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
