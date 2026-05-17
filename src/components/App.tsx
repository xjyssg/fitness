import React, { useState, useEffect, useCallback } from 'react';
import type { AppState, Screen, TrainingPlan, WorkoutSession, WorkoutState } from '../types';
import { savePlan, getPlan, getSessions, saveSession, getIncompleteWorkout, deleteIncompleteWorkout } from '../storage/db';
import { validatePlan } from '../domain/planSchema';
import { migrateEnglishPlan, needsMigration } from '../domain/planMigration';
import HomeScreen from './HomeScreen';
import WorkoutScreen from './WorkoutScreen';
import CardioScreen from './CardioScreen';
import SummaryScreen from './SummaryScreen';
import HistoryScreen from './HistoryScreen';
import samplePlan from '../samplePlans/currentTrainingPlan.json';

export default function App() {
  const [state, setState] = useState<AppState>({
    screen: 'home',
    plan: null,
    workoutState: null,
    completedSession: null,
    sessions: [],
  });

  useEffect(() => {
    (async () => {
      const [plan, sessions, incomplete] = await Promise.all([
        getPlan(),
        getSessions(),
        getIncompleteWorkout(),
      ]);
      setState(s => ({ ...s, plan, sessions }));
      if (incomplete) {
        const resume = confirm('检测到未完成训练，是否继续？');
        if (resume) {
          setState(s => ({ ...s, screen: 'workout', workoutState: incomplete }));
        } else {
          const savePartial = confirm('是否保存已完成组并结束？');
          if (savePartial && incomplete.completedSetLogs.length > 0) {
            await saveSession({
              ...incomplete.session,
              finishedAt: new Date().toISOString(),
              setLogs: incomplete.completedSetLogs,
            });
          }
          await deleteIncompleteWorkout();
          const sessions = await getSessions();
          setState(s => ({ ...s, sessions }));
        }
      }
    })();
  }, []);

  const handleImportPlan = useCallback(async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const result = validatePlan(parsed);
      if (!result.valid) {
        alert(result.errors.map(e => `${e.path}: ${e.message}`).join('\n'));
        return;
      }
      let plan = result.plan!;
      if (needsMigration(plan)) {
        plan = migrateEnglishPlan(plan);
      }
      await savePlan(plan);
      setState(s => ({ ...s, plan }));
    } catch {
      alert('JSON 解析失败，请检查格式。');
    }
  }, []);

  const handleLoadSamplePlan = useCallback(async () => {
    const result = validatePlan(samplePlan);
    if (result.valid && result.plan) {
      await savePlan(result.plan);
      setState(s => ({ ...s, plan: result.plan! }));
    }
  }, []);

  const handleStartWorkout = useCallback(async (workoutState: WorkoutState) => {
    await deleteIncompleteWorkout(); // 开始新训练前清理旧残留
    setState(s => ({ ...s, screen: 'workout', workoutState }));
  }, []);

  const handleStartCardio = useCallback(async (workoutState: WorkoutState) => {
    await deleteIncompleteWorkout();
    setState(s => ({ ...s, screen: 'cardio', workoutState }));
  }, []);

  const handleWorkoutComplete = useCallback(async (session: WorkoutSession) => {
    await saveSession(session);
    await deleteIncompleteWorkout();
    const sessions = await getSessions();
    setState(s => ({
      ...s,
      screen: 'summary',
      completedSession: session,
      workoutState: null,
      sessions,
    }));
  }, []);

  const handleGoHome = useCallback(() => {
    setState(s => ({ ...s, screen: 'home', completedSession: null, workoutState: null }));
  }, []);

  const handleGoHistory = useCallback(async () => {
    const sessions = await getSessions();
    setState(s => ({ ...s, screen: 'history', sessions }));
  }, []);

  const renderScreen = () => {
    switch (state.screen) {
      case 'home':
        return (
          <HomeScreen
            plan={state.plan}
            sessions={state.sessions}
            onImportPlan={handleImportPlan}
            onLoadSamplePlan={handleLoadSamplePlan}
            onStartWorkout={handleStartWorkout}
            onStartCardio={handleStartCardio}
            onGoHistory={handleGoHistory}
          />
        );
      case 'workout':
        return state.workoutState ? (
          <WorkoutScreen
            workoutState={state.workoutState}
            onUpdateState={ws => setState(s => ({ ...s, workoutState: ws }))}
            onComplete={handleWorkoutComplete}
          />
        ) : null;
      case 'cardio':
        return state.workoutState ? (
          <CardioScreen
            workoutState={state.workoutState}
            onComplete={handleWorkoutComplete}
          />
        ) : null;
      case 'summary':
        return state.completedSession ? (
          <SummaryScreen
            session={state.completedSession}
            sessions={state.sessions}
            onGoHome={handleGoHome}
          />
        ) : null;
      case 'history':
        return (
          <HistoryScreen
            sessions={state.sessions}
            onGoHome={handleGoHome}
            onSessionsChange={async () => {
              const sessions = await getSessions();
              setState(s => ({ ...s, sessions }));
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', minHeight: '100dvh' }}>
      {renderScreen()}
    </div>
  );
}
