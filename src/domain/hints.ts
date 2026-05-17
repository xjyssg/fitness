import type { WorkoutSession, SetLog } from '../types';

function parseRepsUpper(reps: string): number | null {
  const match = reps.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return parseInt(match[2], 10);
  const single = reps.match(/^(\d+)/);
  if (single) return parseInt(single[1], 10);
  return null;
}

export function generateHints(session: WorkoutSession, history: WorkoutSession[]): string[] {
  const hints: string[] = [];

  if (!session.setLogs || session.setLogs.length === 0) return hints;

  const recentTopSets = new Map<string, SetLog[]>();

  for (const s of history) {
    if (!s.setLogs) continue;
    for (const log of s.setLogs) {
      if (log.setKind !== 'top') continue;
      const key = log.exerciseId;
      const list = recentTopSets.get(key) || [];
      list.push(log);
      recentTopSets.set(key, list);
    }
  }

  for (const log of session.setLogs) {
    if (log.setKind !== 'top') continue;

    const allTops = recentTopSets.get(log.exerciseId) || [];
    const latestTwo = allTops.slice(-2);

    if (latestTwo.length < 2) continue;

    const targetUpper = parseRepsUpper(log.targetReps);
    if (targetUpper === null) continue;

    const bothHit = latestTwo.every(l => l.actualReps >= targetUpper);
    if (bothHit) {
      hints.push(`${log.exerciseName}：最近两次顶组都达到目标上限，可考虑小幅加重量或降低辅助。`);
    }
  }

  return hints;
}
