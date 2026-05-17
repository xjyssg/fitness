import React from 'react';
import type { WorkoutSession } from '../types';
import { SET_KIND_LABELS } from '../domain/workoutRunner';
import { exportSessionToCSV, exportSessionToJSON, downloadFile } from '../domain/exporters';
import { generateHints } from '../domain/hints';

interface Props {
  session: WorkoutSession;
  sessions: WorkoutSession[];
  onGoHome: () => void;
}

export default function SummaryScreen({ session, sessions, onGoHome }: Props) {
  const hints = generateHints(session, sessions);

  const handleExportCSV = () => {
    const csv = exportSessionToCSV(session);
    const filename = `训练记录-${session.dayName}-${new Date(session.startedAt).toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    const json = exportSessionToJSON(session);
    const filename = `训练记录-${session.dayName}-${new Date(session.startedAt).toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json;charset=utf-8');
  };

  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
        训练完成
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: '14px', marginBottom: 20 }}>
        {session.dayName} · {new Date(session.startedAt).toLocaleString('zh-CN')}
      </div>

      {session.setLogs && session.setLogs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: 8 }}>训练详情</div>
          {session.setLogs.map((log, i) => (
            <div key={i} style={{
              background: '#16213e', borderRadius: 8, padding: '8px 12px',
              marginBottom: 4, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: '13px' }}>{log.exerciseName}</span>
                <span style={{ fontSize: '12px', color: '#888', marginLeft: 8 }}>
                  第{log.setIndex}组 · {SET_KIND_LABELS[log.setKind]}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#e94560' }}>{log.actualReps}次</div>
            </div>
          ))}
        </div>
      )}

      {session.cardioLog && (
        <div style={{
          background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 20,
        }}>
          <div style={{ fontSize: '14px' }}>{session.cardioLog.activity}</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: 4 }}>
            实际时长：{session.cardioLog.actualDurationMinutes}分钟
          </div>
          {session.cardioLog.actualHeartRate && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              心率范围：{session.cardioLog.actualHeartRate}
            </div>
          )}
          {session.cardioLog.notes && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              备注：{session.cardioLog.notes}
            </div>
          )}
        </div>
      )}

      {hints.length > 0 && (
        <div style={{
          background: '#0f3460', borderRadius: 8, padding: 12, marginBottom: 20,
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 6 }}>进阶提示</div>
          {hints.map((hint, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: 4 }}>{hint}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handleExportCSV} style={btnSecondary}>导出 CSV</button>
        <button onClick={handleExportJSON} style={btnSecondary}>导出 JSON</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button onClick={onGoHome} style={btnPrimary}>返回首页</button>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: 8,
  fontSize: '16px',
  fontWeight: 600,
  width: '100%',
  maxWidth: 280,
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: '#0f3460',
  fontWeight: 400,
  fontSize: '14px',
  padding: '8px 16px',
};
