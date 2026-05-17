import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkoutState, WorkoutSession } from '../types';
import {
  completeSet, startNextSet, getRemainingRestSeconds,
  updateActualReps, SET_KIND_LABELS,
} from '../domain/workoutRunner';
import { saveIncompleteWorkout } from '../storage/db';
import { playBeep } from '../reminders/reminder';

interface Props {
  workoutState: WorkoutState;
  onUpdateState: (state: WorkoutState) => void;
  onComplete: (session: WorkoutSession) => void;
}

export default function WorkoutScreen({ workoutState, onUpdateState, onComplete }: Props) {
  const [restSeconds, setRestSeconds] = useState(0);
  const [restComplete, setRestComplete] = useState(false);
  const [repInput, setRepInput] = useState('');
  const [repError, setRepError] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repInputRef = useRef<HTMLInputElement>(null);

  const current = workoutState.flatSets[workoutState.currentFlatIndex];
  const isLastSet = workoutState.currentFlatIndex >= workoutState.flatSets.length - 1;

  // 倒计时显示（仅 UI，不触发震动）
  useEffect(() => {
    if (workoutState.phase === 'rest') {
      setRestComplete(false);
      setRestSeconds(getRemainingRestSeconds(workoutState));

      timerRef.current = setInterval(() => {
        const remaining = getRemainingRestSeconds(workoutState);
        setRestSeconds(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRestComplete(true);
        }
      }, 200);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [workoutState.phase, workoutState.restEndsAt]);

  // 自动保存未完成训练
  useEffect(() => {
    saveIncompleteWorkout(workoutState);
  }, [workoutState]);

  // 清理震动定时器
  useEffect(() => {
    return () => {
      if (vibrateRef.current) clearTimeout(vibrateRef.current);
    };
  }, []);

  const handleCompleteSet = useCallback(() => {
    const repsNum = parseInt(repInput, 10);
    if (!repInput.trim() || isNaN(repsNum) || repsNum <= 0) {
      setRepError(true);
      repInputRef.current?.focus();
      return;
    }
    setRepError(false);
    const next = completeSet(workoutState, repsNum);
    onUpdateState(next);
    setRepInput('');

    if (next.phase === 'completed') {
      onComplete(next.session);
      return;
    }

    // 在用户点击事件的回调中直接用 setTimeout 预定震动，浏览器保留用户手势授权
    const restMs = current.set.restSeconds * 1000;
    if (vibrateRef.current) clearTimeout(vibrateRef.current);
    vibrateRef.current = setTimeout(() => {
      try {
        navigator.vibrate?.([300, 150, 300]);
      } catch { /* 震动不可用时静默跳过 */ }
      // 同时播放声音
      playBeep();
    }, restMs);
  }, [repInput, workoutState, current, onUpdateState, onComplete]);

  const handleNextSet = useCallback(() => {
    const repsNum = parseInt(repInput, 10);
    if (!repInput.trim() || isNaN(repsNum) || repsNum <= 0) {
      setRepError(true);
      repInputRef.current?.focus();
      return;
    }
    setRepError(false);

    // 清除上一次的震动定时器
    if (vibrateRef.current) clearTimeout(vibrateRef.current);

    // 先将用户修正的次数写入最后一组记录
    const lastLogIndex = workoutState.completedSetLogs.length - 1;
    const withUpdatedReps = updateActualReps(workoutState, lastLogIndex, repsNum);
    const next = startNextSet(withUpdatedReps);
    onUpdateState(next);
    setRepInput('');
  }, [repInput, workoutState, onUpdateState]);

  const handleUpdateReps = (index: number, newReps: number) => {
    if (isNaN(newReps) || newReps <= 0) return;
    const next = updateActualReps(workoutState, index, newReps);
    onUpdateState(next);
    setEditingSetIndex(null);
  };

  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        {workoutState.session.dayName}
      </div>

      {workoutState.phase === 'active' && (
        <>
          <div style={{
            background: '#16213e', borderRadius: 12, padding: 20, marginTop: 16,
          }}>
            <div style={{ fontSize: '14px', color: '#aaa' }}>当前动作</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>{current.block.name}</div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <Tag label="组别" value={`第 ${current.setIndex + 1} 组`} />
              <Tag label="类型" value={SET_KIND_LABELS[current.set.kind] || current.set.kind} />
              <Tag label="重量" value={current.set.plannedWeight} />
              <Tag label="目标" value={`${current.set.targetReps} 次`} />
            </div>

            {current.block.primaryMuscles && current.block.primaryMuscles.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {current.block.primaryMuscles.map(m => (
                  <span key={m} style={{
                    background: '#e94560', color: '#fff', padding: '2px 8px',
                    borderRadius: 4, fontSize: '12px',
                  }}>{m}</span>
                ))}
                {current.block.secondaryMuscles?.map(m => (
                  <span key={m} style={{
                    background: '#0f3460', color: '#ccc', padding: '2px 8px',
                    borderRadius: 4, fontSize: '12px',
                  }}>{m}</span>
                ))}
              </div>
            )}

            {current.block.notes && (
              <div style={{ marginTop: 12, fontSize: '13px', color: '#888' }}>
                备注：{current.block.notes}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ fontSize: '14px', color: '#aaa' }}>实际次数</label>
              <input
                ref={repInputRef}
                type="number"
                inputMode="numeric"
                value={repInput}
                onChange={e => { setRepInput(e.target.value); setRepError(false); }}
                placeholder="输入实际次数"
                style={{
                  ...inputStyle,
                  borderColor: repError ? '#e94560' : '#333',
                  marginBottom: 4,
                }}
              />
              {repError && (
                <div style={{ color: '#e94560', fontSize: '13px' }}>请填写实际次数</div>
              )}
            </div>
            <button onClick={handleCompleteSet} style={btnPrimary}>
              {isLastSet ? '完成训练' : '完成本组'}
            </button>
          </div>
        </>
      )}

      {workoutState.phase === 'rest' && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: '64px', fontWeight: 700 }}>
            {restSeconds > 0 ? Math.ceil(restSeconds) : '✓'}
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: 8 }}>
            {restSeconds > 0 ? '剩余休息时间' : '休息完成'}
          </div>

          {restComplete && (
            <div style={{ marginTop: 20 }}>
              <button onClick={handleNextSet} style={btnPrimary}>
                开始下一组
              </button>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <label style={{ fontSize: '14px', color: '#aaa' }}>实际次数</label>
            <input
              ref={repInputRef}
              type="number"
              inputMode="numeric"
              value={repInput}
              onChange={e => { setRepInput(e.target.value); setRepError(false); }}
              placeholder="输入实际次数"
              style={{
                ...inputStyle,
                borderColor: repError ? '#e94560' : '#333',
                marginBottom: 4,
              }}
            />
            {repError && (
              <div style={{ color: '#e94560', fontSize: '13px' }}>请填写实际次数</div>
            )}
          </div>
        </div>
      )}

      {workoutState.completedSetLogs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 8 }}>已完成组</div>
          {workoutState.completedSetLogs.map((log, i) => (
            <div key={i} style={{
              background: '#16213e', borderRadius: 8, padding: '8px 12px',
              marginBottom: 6, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: '13px' }}>{log.exerciseName}</span>
                <span style={{ fontSize: '12px', color: '#888', marginLeft: 8 }}>
                  第{log.setIndex}组 · {SET_KIND_LABELS[log.setKind]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingSetIndex === i ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={log.actualReps}
                    style={{ ...inputStyle, width: 60, padding: '4px 8px' }}
                    onBlur={e => handleUpdateReps(i, parseInt(e.target.value, 10) || 0)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleUpdateReps(i, parseInt((e.target as HTMLInputElement).value, 10) || 0);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    style={{ fontSize: '14px', color: '#e94560', cursor: 'pointer' }}
                    onClick={() => setEditingSetIndex(i)}
                  >
                    {log.actualReps}次
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: '12px' }}>
      <span style={{ color: '#888' }}>{label}：</span>
      <span style={{ color: '#e0e0e0' }}>{value}</span>
    </div>
  );
}

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

const inputStyle: React.CSSProperties = {
  display: 'block',
  margin: '12px auto 0',
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#16213e',
  color: '#fff',
  fontSize: '16px',
  width: '100%',
  maxWidth: 200,
  textAlign: 'center',
};
