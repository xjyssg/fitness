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
      actualWeight: '两边各7.5kg',
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
