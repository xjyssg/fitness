import React, { useRef } from 'react';
import type { TrainingPlan, WorkoutSession, WorkoutState } from '../types';
import { startWorkout } from '../domain/workoutRunner';

interface Props {
  plan: TrainingPlan | null;
  sessions: WorkoutSession[];
  onImportPlan: (jsonStr: string) => void;
  onLoadSamplePlan: () => void;
  onStartWorkout: (state: WorkoutState) => void;
  onStartCardio: (state: WorkoutState) => void;
  onGoHistory: () => void;
}

export default function HomeScreen({
  plan, sessions, onImportPlan, onLoadSamplePlan,
  onStartWorkout, onStartCardio, onGoHistory,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportPlan(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDayClick = (day: TrainingPlan['days'][0]) => {
    if (!plan) return;
    const state = startWorkout(plan, day);
    const isCardio = day.blocks.length === 1 && day.blocks[0].sets.every(s => s.kind === 'cardio');
    if (isCardio) {
      onStartCardio(state);
    } else {
      onStartWorkout(state);
    }
  };

  const lastSession = sessions.length > 0 ? sessions[0] : null;

  return (
    <div>
      <h1 style={{ fontSize: '24px', textAlign: 'center', marginBottom: 4 }}>训练助手</h1>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 20, fontSize: '14px' }}>离线训练记录</p>

      {!plan ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ marginBottom: 16, color: '#aaa' }}>还没有训练计划，请先导入或加载示例计划</p>
          <button onClick={() => fileRef.current?.click()} style={btnPrimary}>
            导入训练计划 JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ marginTop: 12 }}>
            <button onClick={onLoadSamplePlan} style={btnSecondary}>
              加载示例计划
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{plan.planName}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>版本 {plan.version}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {plan.days.map(day => (
              <button
                key={day.id}
                onClick={() => handleDayClick(day)}
                style={{
                  ...btnTrainingDay,
                  display: 'block',
                  width: '100%',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{day.name}</div>
                {day.focus && <div style={{ fontSize: '12px', color: '#aaa', marginTop: 2 }}>{day.focus}</div>}
              </button>
            ))}
          </div>

          {lastSession && (
            <div style={{
              background: '#16213e',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 4 }}>最近训练</div>
              <div>{lastSession.dayName} — {new Date(lastSession.startedAt).toLocaleDateString('zh-CN')}</div>
              {lastSession.setLogs && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                  完成 {lastSession.setLogs.length} 组
                </div>
              )}
              {lastSession.cardioLog && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                  {lastSession.cardioLog.activity} · {lastSession.cardioLog.actualDurationMinutes}分钟
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={onGoHistory} style={btnSecondary}>
              训练历史
            </button>
            <button onClick={() => fileRef.current?.click()} style={btnSecondary}>
              导入新计划
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
        </>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: 8,
  fontSize: '16px',
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: '#0f3460',
  fontWeight: 400,
  fontSize: '14px',
  padding: '8px 16px',
};

const btnTrainingDay: React.CSSProperties = {
  ...btnPrimary,
  background: '#16213e',
  textAlign: 'left',
  fontWeight: 400,
};
