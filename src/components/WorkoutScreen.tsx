import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { WorkoutState, WorkoutSession, Block, ExerciseBlock, SetLog } from '../types';
import {
  selectBlock, completeSet, startNextSet, getRemainingRestSeconds,
  updateActualReps, SET_KIND_LABELS,
} from '../domain/workoutRunner';
import { saveIncompleteWorkout } from '../storage/db';
import { playBeep } from '../reminders/reminder';

const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug');
const DEBUG_REST_SECONDS = 3;

interface Props {
  workoutState: WorkoutState;
  sessions: WorkoutSession[];
  onUpdateState: (state: WorkoutState) => void;
  onComplete: (session: WorkoutSession) => void;
}

/** 从计划重量中提取前缀和数值，如 "两边各7.5kg" → { prefix: "两边各", number: "7.5" } */
function parseWeight(weight: string): { prefix: string; number: string; isKg: boolean } {
  const match = weight.match(/^([一-龥]*)\s*([\d.]+)\s*kg\s*$/);
  if (match) return { prefix: match[1], number: match[2], isKg: true };
  return { prefix: '', number: weight, isKg: false };
}

function buildWeight(prefix: string, number: string): string {
  const trimmed = number.trim();
  if (!trimmed) return prefix || '';
  if (prefix) return `${prefix}${trimmed}kg`;
  return `${trimmed}kg`;
}

/** 简化重量显示：去掉中文前缀，只保留数字+单位 */
function simplifyWeight(weight: string): string {
  return weight.replace(/^[一-龥]+/, '');
}

export default function WorkoutScreen({ workoutState, sessions, onUpdateState, onComplete }: Props) {
  const [restSeconds, setRestSeconds] = useState(0);
  const [restComplete, setRestComplete] = useState(false);
  const [repInput, setRepInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [weightPrefix, setWeightPrefix] = useState('');
  const [weightIsKg, setWeightIsKg] = useState(true);
  const [repError, setRepError] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repInputRef = useRef<HTMLInputElement>(null);
  const [optionBlockIndex, setOptionBlockIndex] = useState<number | null>(null);

  const current = workoutState.flatSets[workoutState.currentFlatIndex];
  const isLastSetInBlock = workoutState.currentFlatIndex >= workoutState.flatSets.length - 1;
  const isLastBlock = workoutState.remainingBlockIndices.length === 1;
  const isLastSet = isLastSetInBlock && isLastBlock;

  // 同训练日、同计划的历史记录，按 exerciseId-setIndex 索引每组数据
  const lastSetByKey = useMemo(() => {
    const map = new Map<string, { actualWeight: string; actualReps: number }>();
    for (const s of sessions) {
      if (s.dayId !== workoutState.session.dayId) continue;
      if (!s.setLogs) continue;
      for (const log of s.setLogs) {
        const key = `${log.exerciseId}-${log.setIndex}`;
        if (!map.has(key)) {
          map.set(key, { actualWeight: log.actualWeight, actualReps: log.actualReps });
        }
      }
    }
    return map;
  }, [sessions, workoutState.session.dayId]);

  // 当前组切换时预填计划重量（只提取数值部分）
  useEffect(() => {
    if (current) {
      const { prefix, number, isKg } = parseWeight(current.set.plannedWeight);
      setWeightPrefix(prefix);
      setWeightInput(number);
      setWeightIsKg(isKg);
    }
  }, [workoutState.currentBlockIndex, workoutState.currentFlatIndex]);

  // 倒计时显示
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

  useEffect(() => {
    if (!DEBUG_MODE) saveIncompleteWorkout(workoutState);
  }, [workoutState]);

  useEffect(() => {
    return () => {
      if (vibrateRef.current) clearTimeout(vibrateRef.current);
    };
  }, []);

  const handleBlockSelect = useCallback((blockIndex: number) => {
    const block = workoutState.allBlocks[blockIndex];
    if ('options' in block) {
      setOptionBlockIndex(blockIndex);
      return;
    }
    const next = selectBlock(workoutState, blockIndex);
    onUpdateState(next);
  }, [workoutState, onUpdateState]);

  const handleOptionSelect = useCallback((exerciseId: string) => {
    if (optionBlockIndex === null) return;
    const next = selectBlock(workoutState, optionBlockIndex, exerciseId);
    onUpdateState(next);
    setOptionBlockIndex(null);
  }, [workoutState, optionBlockIndex, onUpdateState]);

  const handleCompleteSet = useCallback(() => {
    const repsNum = parseInt(repInput, 10);
    if (!repInput.trim() || isNaN(repsNum) || repsNum <= 0) {
      setRepError(true);
      repInputRef.current?.focus();
      return;
    }
    setRepError(false);

    const actualWeight = weightIsKg
      ? buildWeight(weightPrefix, weightInput)
      : weightInput;

    let next = completeSet(workoutState, repsNum, actualWeight);

    // Debug 模式：倒计时固定 3 秒
    if (DEBUG_MODE && next.phase === 'rest') {
      const now = new Date();
      next = {
        ...next,
        restEndsAt: new Date(now.getTime() + DEBUG_REST_SECONDS * 1000).toISOString(),
      };
    }

    onUpdateState(next);
    setRepInput('');

    if (next.phase === 'completed') {
      onComplete(next.session);
      return;
    }

    if (next.phase === 'rest') {
      const restMs = DEBUG_MODE ? DEBUG_REST_SECONDS * 1000 : (current?.set.restSeconds || 60) * 1000;
      if (vibrateRef.current) clearTimeout(vibrateRef.current);
      vibrateRef.current = setTimeout(() => {
        try { navigator.vibrate?.([300, 150, 300]); } catch {}
        playBeep();
      }, restMs);
    }
  }, [repInput, weightInput, weightIsKg, weightPrefix, workoutState, current, onUpdateState, onComplete]);

  const handleNextSet = useCallback(() => {
    if (vibrateRef.current) clearTimeout(vibrateRef.current);
    const next = startNextSet(workoutState);
    onUpdateState(next);
  }, [workoutState, onUpdateState]);

  const handleUpdateReps = (index: number, newReps: number) => {
    if (isNaN(newReps) || newReps <= 0) return;
    const next = updateActualReps(workoutState, index, newReps);
    onUpdateState(next);
    setEditingSetIndex(null);
  };

  // ===== 待选择模式 =====
  if (workoutState.currentBlockIndex === null && workoutState.phase !== 'completed') {
    const remaining = workoutState.remainingBlockIndices.map(i => workoutState.allBlocks[i]);
    return (
      <div>
        <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          {workoutState.session.dayName}
        </div>
        <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 12, textAlign: 'center' }}>
          选择下一个动作
        </div>
        {remaining.map((block, idx) => {
          const origIdx = workoutState.remainingBlockIndices[idx];
          const name = 'options' in block ? block.name : block.name;
          const firstBlock = 'options' in block ? block.options[0] : block;
          const firstSet = firstBlock.sets[0];
          // 查找上次记录
          const lastData = lastSetByKey.get(`${firstBlock.exerciseId}-1`);
          return (
            <button
              key={origIdx}
              onClick={() => handleBlockSelect(origIdx)}
              style={blockCardStyle}
            >
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
                {'options' in block
                  ? `${block.options.length} 个备选 · ${block.options[0].sets.length} 组`
                  : `${block.sets.length} 组 · ${firstSet.plannedWeight}`
                }
                {lastData && (
                  <span style={{ color: '#e94560', marginLeft: 8 }}>
                    上次 {lastData.actualWeight} × {lastData.actualReps}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {workoutState.completedSetLogs.length > 0 && (
          <CompletedSets
            logs={workoutState.completedSetLogs}
            lastSetByKey={lastSetByKey}
            editingIndex={editingSetIndex}
            onEdit={setEditingSetIndex}
            onUpdate={handleUpdateReps}
          />
        )}
      </div>
    );
  }

  // ===== 备选动作选择器 =====
  if (optionBlockIndex !== null) {
    const block = workoutState.allBlocks[optionBlockIndex] as Extract<Block, { options: ExerciseBlock[] }>;
    return (
      <div>
        <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          {block.name}
        </div>
        <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 12, textAlign: 'center' }}>
          选择执行动作
        </div>
        {block.options.map(opt => {
          const lastData = lastSetByKey.get(`${opt.exerciseId}-1`);
          return (
            <button
              key={opt.exerciseId}
              onClick={() => handleOptionSelect(opt.exerciseId)}
              style={blockCardStyle}
            >
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{opt.name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
                {opt.sets.length} 组 · {opt.sets[0].plannedWeight} · {opt.sets[0].targetReps}次
                {lastData && (
                  <span style={{ color: '#e94560', marginLeft: 8 }}>
                    上次 {lastData.actualWeight} × {lastData.actualReps}
                  </span>
                )}
              </div>
              {opt.primaryMuscles && (
                <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {opt.primaryMuscles.map(m => (
                    <span key={m} style={muscleTagStyle}>{m}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ===== 正常执行模式 =====
  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        {workoutState.session.dayName}
        {DEBUG_MODE && (
          <span style={{
            background: '#ff9800', color: '#000', fontSize: '11px', padding: '2px 6px',
            borderRadius: 4, marginLeft: 8, verticalAlign: 'middle',
          }}>DEBUG {DEBUG_REST_SECONDS}s</span>
        )}
      </div>

      {workoutState.phase === 'active' && current && (
        <>
          <div style={{
            background: '#16213e', borderRadius: 12, padding: 20, marginTop: 16,
          }}>
            <div style={{ fontSize: '14px', color: '#aaa' }}>当前动作</div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>{current.block.name}</div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <Tag label="组别" value={`第 ${current.setIndex + 1} 组 / 共 ${workoutState.flatSets.length} 组`} />
              <Tag label="类型" value={SET_KIND_LABELS[current.set.kind] || current.set.kind} />
              <Tag label="计划重量" value={current.set.plannedWeight} />
              <Tag label="目标" value={`${current.set.targetReps} 次`} />
            </div>

            {lastSetByKey.get(`${current.block.exerciseId}-${current.setIndex + 1}`) && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#e94560' }}>
                上次：{lastSetByKey.get(`${current.block.exerciseId}-${current.setIndex + 1}`)!.actualWeight} × {lastSetByKey.get(`${current.block.exerciseId}-${current.setIndex + 1}`)!.actualReps}次
              </div>
            )}

            {current.block.primaryMuscles && current.block.primaryMuscles.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {current.block.primaryMuscles.map(m => (
                  <span key={m} style={muscleTagPrimaryStyle}>{m}</span>
                ))}
                {current.block.secondaryMuscles?.map(m => (
                  <span key={m} style={muscleTagSecondaryStyle}>{m}</span>
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
            <div style={{ marginTop: 12, marginBottom: 12, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <div>
                <label style={{ fontSize: '14px', color: '#aaa' }}>
                  实际重量{weightIsKg ? ' (kg)' : ''}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  placeholder={weightIsKg ? '数字' : '重量'}
                  style={{
                    ...inputStyle,
                    maxWidth: 100,
                    marginTop: 4,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#aaa' }}>实际次数</label>
                <input
                  ref={repInputRef}
                  type="number"
                  inputMode="numeric"
                  value={repInput}
                  onChange={e => { setRepInput(e.target.value); setRepError(false); }}
                  placeholder="次数"
                  style={{
                    ...inputStyle,
                    borderColor: repError ? '#e94560' : '#333',
                    maxWidth: 80,
                    marginTop: 4,
                    marginBottom: 4,
                  }}
                />
              </div>
            </div>
            {repError && (
              <div style={{ color: '#e94560', fontSize: '13px' }}>请填写实际次数</div>
            )}
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
        </div>
      )}

      {workoutState.completedSetLogs.length > 0 && (
        <CompletedSets
          logs={workoutState.completedSetLogs}
          lastSetByKey={lastSetByKey}
          editingIndex={editingSetIndex}
          onEdit={setEditingSetIndex}
          onUpdate={handleUpdateReps}
        />
      )}
    </div>
  );
}

function CompletedSets({
  logs, lastSetByKey, editingIndex, onEdit, onUpdate,
}: {
  logs: SetLog[];
  lastSetByKey: Map<string, { actualWeight: string; actualReps: number }>;
  editingIndex: number | null;
  onEdit: (i: number) => void;
  onUpdate: (i: number, reps: number) => void;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 8 }}>已完成组</div>
      {logs.map((log, i) => {
        const lastData = lastSetByKey.get(`${log.exerciseId}-${log.setIndex}`);
        return (
          <div key={i} style={{
            background: '#16213e', borderRadius: 8, padding: '8px 12px',
            marginBottom: 6, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <span style={{ fontSize: '13px' }}>{log.exerciseName}</span>
              <span style={{ fontSize: '12px', color: '#888', marginLeft: 8 }}>
                第{log.setIndex}组 · {simplifyWeight(log.actualWeight)}
              </span>
              {lastData && (
                <span style={{ fontSize: '11px', color: '#e94560', marginLeft: 8 }}>
                  上次 {simplifyWeight(lastData.actualWeight)} × {lastData.actualReps}次
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {editingIndex === i ? (
                <input
                  type="number"
                  inputMode="numeric"
                  defaultValue={log.actualReps}
                  style={{ ...inputStyle, width: 60, padding: '4px 8px' }}
                  onBlur={e => onUpdate(i, parseInt(e.target.value, 10) || 0)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onUpdate(i, parseInt((e.target as HTMLInputElement).value, 10) || 0);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span
                  style={{ fontSize: '14px', color: '#e94560', cursor: 'pointer' }}
                  onClick={() => onEdit(i)}
                >
                  {log.actualReps}次
                </span>
              )}
            </div>
          </div>
        );
      })}
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

const blockCardStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: '#16213e',
  color: '#e0e0e0',
  padding: '14px 16px',
  borderRadius: 10,
  marginBottom: 8,
  textAlign: 'left',
  border: '1px solid #1e3a5f',
};

const muscleTagStyle: React.CSSProperties = {
  background: '#0f3460', color: '#ccc', padding: '2px 8px',
  borderRadius: 4, fontSize: '12px',
};

const muscleTagPrimaryStyle: React.CSSProperties = {
  background: '#e94560', color: '#fff', padding: '2px 8px',
  borderRadius: 4, fontSize: '12px',
};

const muscleTagSecondaryStyle: React.CSSProperties = {
  background: '#0f3460', color: '#ccc', padding: '2px 8px',
  borderRadius: 4, fontSize: '12px',
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
