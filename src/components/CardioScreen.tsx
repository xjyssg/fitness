import React, { useState } from 'react';
import type { WorkoutState, WorkoutSession, CardioLog } from '../types';

interface Props {
  workoutState: WorkoutState;
  onComplete: (session: WorkoutSession) => void;
}

export default function CardioScreen({ workoutState, onComplete }: Props) {
  const block = workoutState.flatSets[0]?.block;
  const set = workoutState.flatSets[0]?.set;

  const [duration, setDuration] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    const now = new Date();

    const cardioLog: CardioLog = {
      sessionId: workoutState.session.sessionId,
      dayId: workoutState.session.dayId,
      dayName: workoutState.session.dayName,
      activity: block?.name || '',
      targetDurationMinutes: set?.targetReps || '',
      targetHeartRate: set?.plannedWeight || '',
      actualDurationMinutes: parseInt(duration, 10) || 0,
      actualHeartRate: heartRate || '',
      notes: notes || '',
      completedAt: now.toISOString(),
    };

    const session: WorkoutSession = {
      ...workoutState.session,
      finishedAt: now.toISOString(),
      cardioLog,
    };

    onComplete(session);
  };

  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        {workoutState.session.dayName}
      </div>

      <div style={{
        background: '#16213e', borderRadius: 12, padding: 20, marginTop: 16,
      }}>
        <div style={{ fontSize: '14px', color: '#aaa' }}>有氧项目</div>
        <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>{block?.name}</div>

        {block?.notes && (
          <div style={{ marginTop: 12, fontSize: '13px', color: '#888' }}>
            备注：{block.notes}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#888' }}>目标时长：</span>
            <span style={{ fontSize: '13px' }}>{set?.targetReps}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#888' }}>目标心率：</span>
            <span style={{ fontSize: '13px' }}>{set?.plannedWeight}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={labelStyle}>实际时长（分钟）</label>
        <input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="输入实际时长"
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>心率范围</label>
        <input
          type="text"
          value={heartRate}
          onChange={e => setHeartRate(e.target.value)}
          placeholder="例如 132-142"
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>备注</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="训练感受..."
          style={{ ...inputStyle, height: 80, resize: 'vertical' }}
        />
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={handleComplete} style={btnPrimary}>
          完成有氧
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  color: '#aaa',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#16213e',
  color: '#fff',
  fontSize: '16px',
  width: '100%',
  maxWidth: 300,
};

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: 8,
  fontSize: '18px',
  fontWeight: 600,
  width: '100%',
  maxWidth: 280,
};
