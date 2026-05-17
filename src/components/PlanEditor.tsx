import React, { useState } from 'react';
import type { TrainingPlan, ExerciseBlock } from '../types';
import { downloadFile } from '../domain/exporters';

const SET_KIND_LABELS_MAP: Record<string, string> = {
  top: '顶组', backoff: '降重组', working: '正式组', accessory: '辅助组', cardio: '有氧',
};

interface Props {
  plan: TrainingPlan;
  onBack: () => void;
}

export default function PlanEditor({ plan, onBack }: Props) {
  const [editedPlan, setEditedPlan] = useState<TrainingPlan>(() =>
    JSON.parse(JSON.stringify(plan))
  );
  const [dayIndex, setDayIndex] = useState(0);

  const day = editedPlan.days[dayIndex];

  type FlatEntry = {
    blockIdx: number; setIdx: number; block: ExerciseBlock;
    label: string; optIdx?: number; optLabel?: string;
  };
  const entries: FlatEntry[] = [];

  day.blocks.forEach((block, bi) => {
    if ('options' in block) {
      block.options.forEach((opt, oi) => {
        opt.sets.forEach((_set, si) => {
          entries.push({
            blockIdx: bi, setIdx: si, block: opt,
            label: oi === 0 ? block.name : '',
            optIdx: oi,
            optLabel: opt.name,
          });
        });
      });
    } else {
      block.sets.forEach((_set, si) => {
        entries.push({
          blockIdx: bi, setIdx: si, block,
          label: block.name,
        });
      });
    }
  });

  const handleWeightChange = (blockIdx: number, setIdx: number, value: string, optIdx?: number) => {
    const next = JSON.parse(JSON.stringify(editedPlan)) as TrainingPlan;
    const block = next.days[dayIndex].blocks[blockIdx];
    if ('options' in block && optIdx !== undefined) {
      block.options[optIdx].sets[setIdx].plannedWeight = value;
    } else if (!('options' in block)) {
      (block as ExerciseBlock).sets[setIdx].plannedWeight = value;
    }
    setEditedPlan(next);
  };

  const handleRepsChange = (blockIdx: number, setIdx: number, value: string, optIdx?: number) => {
    const next = JSON.parse(JSON.stringify(editedPlan)) as TrainingPlan;
    const block = next.days[dayIndex].blocks[blockIdx];
    if ('options' in block && optIdx !== undefined) {
      block.options[optIdx].sets[setIdx].targetReps = value;
    } else if (!('options' in block)) {
      (block as ExerciseBlock).sets[setIdx].targetReps = value;
    }
    setEditedPlan(next);
  };

  const handleExport = () => {
    downloadFile(
      JSON.stringify(editedPlan, null, 2),
      `训练计划-${editedPlan.planName}.json`,
      'application/json;charset=utf-8'
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={backBtn}>← 返回</button>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>训练计划编辑器</div>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {editedPlan.days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setDayIndex(i)}
            style={{
              ...tabStyle,
              background: i === dayIndex ? '#e94560' : '#16213e',
            }}
          >
            {d.name}
          </button>
        ))}
      </div>

      {entries.map((entry, idx) => {
        const set = entry.block.sets[entry.setIdx];
        return (
          <div key={idx} style={setRowStyle}>
            <div style={{ marginBottom: 8 }}>
              {entry.label && (
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
                  {entry.label}
                </div>
              )}
              {entry.optLabel && entry.label !== entry.optLabel && (
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
                  {entry.optLabel}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                第{entry.setIdx + 1}组 · {SET_KIND_LABELS_MAP[set.kind] || set.kind}
                {entry.optIdx !== undefined ? ` · 备选${entry.optIdx + 1}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>重量</label>
                <input
                  type="text"
                  value={set.plannedWeight}
                  onChange={e => handleWeightChange(entry.blockIdx, entry.setIdx, e.target.value, entry.optIdx)}
                  style={editInputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>次数</label>
                <input
                  type="text"
                  value={set.targetReps}
                  onChange={e => handleRepsChange(entry.blockIdx, entry.setIdx, e.target.value, entry.optIdx)}
                  style={editInputStyle}
                />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: 4 }}>
              休息 {set.restSeconds}秒
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 40 }}>
        <button onClick={handleExport} style={exportBtn}>
          导出 JSON
        </button>
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: 'none', color: '#e94560', fontSize: '14px', border: 'none', cursor: 'pointer',
};

const tabStyle: React.CSSProperties = {
  color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: '13px',
  fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
};

const setRowStyle: React.CSSProperties = {
  background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#888', marginBottom: 2,
};

const editInputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid #333', background: '#1a1a2e', color: '#fff', fontSize: '14px',
  outline: 'none',
};

const exportBtn: React.CSSProperties = {
  background: '#e94560', color: '#fff', padding: '14px 40px', borderRadius: 8,
  fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer',
};
