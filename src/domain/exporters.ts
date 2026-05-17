import type { WorkoutSession, SetLog } from '../types';

function escapeCSVField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const SET_LOG_HEADERS = [
  'sessionId', 'dayId', 'dayName', 'exerciseId', 'exerciseName',
  'setIndex', 'setKind', 'plannedWeight', 'actualWeight', 'targetReps', 'actualReps',
  'plannedRestSeconds', 'actualRestSeconds', 'completedAt',
];

function setLogToCSVRow(log: SetLog): string {
  return [
    log.sessionId, log.dayId, log.dayName, log.exerciseId, log.exerciseName,
    log.setIndex, log.setKind, log.plannedWeight, log.actualWeight,
    log.targetReps, log.actualReps,
    log.plannedRestSeconds, log.actualRestSeconds, log.completedAt,
  ].map(escapeCSVField).join(',');
}

function setLogsToCSV(session: WorkoutSession): string {
  const rows = (session.setLogs || []).map(setLogToCSVRow);
  if (rows.length === 0) return SET_LOG_HEADERS.join(',');
  return [SET_LOG_HEADERS.join(','), ...rows].join('\n');
}

function cardioLogToCSV(session: WorkoutSession): string {
  const log = session.cardioLog;
  if (!log) return '';
  const header = 'sessionId,dayId,dayName,activity,targetDurationMinutes,targetHeartRate,actualDurationMinutes,actualHeartRate,notes,completedAt';
  const row = [
    log.sessionId, log.dayId, log.dayName, log.activity,
    log.targetDurationMinutes, log.targetHeartRate,
    log.actualDurationMinutes, log.actualHeartRate,
    log.notes, log.completedAt,
  ].map(escapeCSVField).join(',');
  return [header, row].join('\n');
}

export function exportSessionToCSV(session: WorkoutSession): string {
  if (session.cardioLog) {
    return cardioLogToCSV(session);
  }
  return setLogsToCSV(session);
}

export function exportSessionToJSON(session: WorkoutSession): string {
  return JSON.stringify(session, null, 2);
}

export function exportAllSessionsToCSV(sessions: WorkoutSession[]): string {
  const allRows: string[] = [SET_LOG_HEADERS.join(',')];
  for (const session of sessions) {
    if (session.cardioLog) continue;
    const rows = (session.setLogs || []).map(setLogToCSVRow);
    allRows.push(...rows);
  }
  return allRows.join('\n');
}

export function exportAllSessionsToJSON(sessions: WorkoutSession[]): string {
  return JSON.stringify(sessions, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['﻿' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
