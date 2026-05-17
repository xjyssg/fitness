import React from 'react';
import type { WorkoutSession } from '../types';
import { exportAllSessionsToCSV, exportAllSessionsToJSON, downloadFile } from '../domain/exporters';
import { clearAll, getSessions } from '../storage/db';

interface Props {
  sessions: WorkoutSession[];
  onGoHome: () => void;
  onSessionsChange: () => void;
}

export default function HistoryScreen({ sessions, onGoHome, onSessionsChange }: Props) {
  const handleExportAllCSV = () => {
    const csv = exportAllSessionsToCSV(sessions);
    const filename = `全部训练记录-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportAllJSON = () => {
    const json = exportAllSessionsToJSON(sessions);
    const filename = `全部训练记录-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json;charset=utf-8');
  };

  const handleClear = async () => {
    const confirmed = confirm('确认清空所有本地数据？此操作不可恢复。');
    if (!confirmed) return;
    const doubleConfirm = confirm('再次确认：清空所有训练计划、历史记录和未完成训练？');
    if (!doubleConfirm) return;
    await clearAll();
    onSessionsChange();
    onGoHome();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onGoHome} style={{ background: 'none', color: '#e94560', fontSize: '14px' }}>
          ← 返回
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>训练历史</div>
        <div style={{ width: 50 }} />
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          暂无训练记录
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {sessions.map(session => (
            <div key={session.sessionId} style={{
              background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{session.dayName}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                    {new Date(session.startedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#aaa' }}>
                  {session.setLogs && `完成 ${session.setLogs.length} 组`}
                  {session.cardioLog && `${session.cardioLog.activity} · ${session.cardioLog.actualDurationMinutes}分钟`}
                </div>
              </div>
              {session.cardioLog?.actualHeartRate && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
                  心率：{session.cardioLog.actualHeartRate}
                  {session.cardioLog.notes && ` · ${session.cardioLog.notes}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={handleExportAllCSV} style={btnSecondary}>导出全部 CSV</button>
          <button onClick={handleExportAllJSON} style={btnSecondary}>导出全部 JSON</button>
          <button onClick={handleClear} style={btnDanger}>清空数据</button>
        </div>
      )}
    </div>
  );
}

const btnSecondary: React.CSSProperties = {
  background: '#0f3460',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: '14px',
  border: 'none',
};

const btnDanger: React.CSSProperties = {
  ...btnSecondary,
  background: '#333',
  color: '#e94560',
};
