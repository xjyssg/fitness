import React, { useState } from 'react';
import type { WorkoutSession, SetLog } from '../types';
import { exportAllSessionsToCSV, exportAllSessionsToJSON, downloadFile } from '../domain/exporters';
import { clearAll, deleteSession, saveSession } from '../storage/db';

interface Props {
  sessions: WorkoutSession[];
  onGoHome: () => void;
  onSessionsChange: () => void;
}

function simplifyWeight(weight: string): string {
  return weight.replace(/^[一-龥]+/, '');
}

export default function HistoryScreen({ sessions, onGoHome, onSessionsChange }: Props) {
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [editing, setEditing] = useState<{ setIndex: number; field: 'weight' | 'reps' } | null>(null);
  const [editedSession, setEditedSession] = useState<WorkoutSession | null>(null);

  const handleExportAllCSV = () => {
    const csv = exportAllSessionsToCSV(sessions);
    downloadFile(csv, `全部训练记录-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  };

  const handleExportAllJSON = () => {
    const json = exportAllSessionsToJSON(sessions);
    downloadFile(json, `全部训练记录-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8');
  };

  const handleClear = async () => {
    if (!confirm('确认清空所有本地数据？此操作不可恢复。')) return;
    if (!confirm('再次确认：清空所有训练计划、历史记录和未完成训练？')) return;
    await clearAll();
    onSessionsChange();
    onGoHome();
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('确认删除这条训练记录？')) return;
    await deleteSession(sessionId);
    onSessionsChange();
  };

  const handleViewDetail = (session: WorkoutSession) => {
    setDetailSession(session);
    setEditedSession(JSON.parse(JSON.stringify(session)));
    setEditing(null);
  };

  const handleSaveEdits = async () => {
    if (!editedSession) return;
    await saveSession(editedSession);
    setDetailSession(null);
    setEditing(null);
    onSessionsChange();
  };

  const handleEditStart = (setIndex: number, field: 'weight' | 'reps') => {
    setEditing({ setIndex, field });
  };

  const handleEditCommit = (value: string) => {
    if (!editedSession || !editing || !editedSession.setLogs) return;
    const updatedLogs = editedSession.setLogs.map((log, i) => {
      if (i !== editing.setIndex) return log;
      if (editing.field === 'weight') return { ...log, actualWeight: value };
      return { ...log, actualReps: parseInt(value, 10) || log.actualReps };
    });
    setEditedSession({ ...editedSession, setLogs: updatedLogs });
    setEditing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onGoHome} style={backBtn}>← 返回</button>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>训练历史</div>
        <div style={{ width: 50 }} />
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>暂无训练记录</div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {sessions.map(session => (
            <div key={session.sessionId} onClick={() => handleViewDetail(session)} style={sessionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{session.dayName}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                    {new Date(session.startedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: '13px', color: '#aaa' }}>
                    {session.setLogs && `完成 ${session.setLogs.length} 组`}
                    {session.cardioLog && `${session.cardioLog.activity} · ${session.cardioLog.actualDurationMinutes}分钟`}
                  </div>
                  <button onClick={e => handleDelete(e, session.sessionId)} style={deleteBtn}>删除</button>
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

      {/* 详情弹窗 */}
      {detailSession && editedSession && (
        <div onClick={() => { setDetailSession(null); setEditing(null); }} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{detailSession.dayName}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {new Date(detailSession.startedAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <button onClick={handleSaveEdits} style={saveBtn}>保存修改</button>
            </div>

            {editedSession.setLogs && editedSession.setLogs.length > 0 && (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {editedSession.setLogs.map((log, i) => (
                  <div key={i} style={detailRow}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{log.exerciseName}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>第{log.setIndex}组</span>
                      {editing?.setIndex === i && editing?.field === 'weight' ? (
                        <input type="text" defaultValue={log.actualWeight}
                          style={editInput}
                          onBlur={e => handleEditCommit(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditCommit((e.target as HTMLInputElement).value); }}
                          autoFocus />
                      ) : (
                        <span style={{ fontSize: '13px', color: '#e94560', cursor: 'pointer' }}
                          onClick={() => handleEditStart(i, 'weight')}>
                          {simplifyWeight(log.actualWeight)}
                        </span>
                      )}
                      <span style={{ color: '#555' }}>×</span>
                      {editing?.setIndex === i && editing?.field === 'reps' ? (
                        <input type="number" inputMode="numeric" defaultValue={log.actualReps}
                          style={{ ...editInput, width: 56 }}
                          onBlur={e => handleEditCommit(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditCommit((e.target as HTMLInputElement).value); }}
                          autoFocus />
                      ) : (
                        <span style={{ fontSize: '14px', color: '#e94560', cursor: 'pointer' }}
                          onClick={() => handleEditStart(i, 'reps')}>
                          {log.actualReps}次
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editedSession.cardioLog && (
              <div style={detailRow}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{editedSession.cardioLog.activity}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
                  {editedSession.cardioLog.actualDurationMinutes}分钟 · 心率{editedSession.cardioLog.actualHeartRate}
                  {editedSession.cardioLog.notes && ` · ${editedSession.cardioLog.notes}`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = { background: 'none', color: '#e94560', fontSize: '14px', border: 'none', cursor: 'pointer' };
const sessionCard: React.CSSProperties = { background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'pointer' };
const deleteBtn: React.CSSProperties = { background: '#333', color: '#e94560', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: '12px', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { background: '#0f3460', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: '14px', border: 'none' };
const btnDanger: React.CSSProperties = { ...btnSecondary, background: '#333', color: '#e94560' };
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' };
const modalStyle: React.CSSProperties = { background: '#1a1a2e', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', overflow: 'hidden' };
const saveBtn: React.CSSProperties = { background: '#e94560', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: '13px', cursor: 'pointer' };
const detailRow: React.CSSProperties = { background: '#16213e', borderRadius: 8, padding: '10px 12px', marginBottom: 6 };
const editInput: React.CSSProperties = { padding: '2px 6px', borderRadius: 4, border: '1px solid #e94560', background: '#1a1a2e', color: '#fff', fontSize: '13px', width: 80, textAlign: 'center' };
