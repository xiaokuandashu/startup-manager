import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../i18n';

interface RecordedStep {
  type: string;
  x?: number;
  y?: number;
  button?: string;
  key?: string;
  delta_x?: number;
  delta_y?: number;
  delay_ms: number;
}

interface SavedRecording {
  id: string;
  name: string;
  created_at: string;
  duration_ms: number;
  step_count: number;
  steps: RecordedStep[];
}

interface RecordingPageProps {
  lang?: Language;
}

const STEP_ICONS: Record<string, string> = {
  mouse_move: '🖱️',
  mouse_click: '👆',
  mouse_release: '👆',
  mouse_scroll: '📜',
  key_press: '⌨️',
  key_release: '⌨️',
};

const STEP_LABELS: Record<string, string> = {
  mouse_move: '鼠标移动',
  mouse_click: '鼠标点击',
  mouse_release: '鼠标释放',
  mouse_scroll: '滚轮',
  key_press: '按下按键',
  key_release: '释放按键',
};

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
};

const formatDate = (ts: string): string => {
  const num = parseInt(ts);
  if (isNaN(num)) return ts;
  const d = new Date(num * 1000);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const RecordingPage: React.FC<RecordingPageProps> = ({ lang: _lang = 'zh' }) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  const [timer, setTimer] = useState(0);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  // 轮询录制状态
  useEffect(() => {
    if (recordingState === 'idle') return;
    const poll = setInterval(async () => {
      try {
        if ((window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const status = await invoke<{ state: string; step_count: number; duration_ms: number }>('recording_status');
          if (status.state === 'idle') {
            setRecordingState('idle');
          }
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(poll);
  }, [recordingState]);

  const loadRecordings = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const list = await invoke<SavedRecording[]>('recording_list');
        setSavedRecordings(list);
      }
    } catch { /* ignore */ }
  };

  const handleStart = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_start');
        setRecordingState('recording');
        setSteps([]);
        setTimer(0);
      }
    } catch (e) {
      alert('启动录制失败：' + e);
    }
  };

  const handlePause = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const state = await invoke<string>('recording_pause');
        setRecordingState(state as 'recording' | 'paused');
      }
    } catch { /* ignore */ }
  };

  const handleStop = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<RecordedStep[]>('recording_stop');
        setSteps(result);
        setRecordingState('idle');
        setShowSaveDialog(true);
      }
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_save', {
          name: saveName.trim(),
          steps: steps,
          durationMs: timer * 1000,
        });
        setSaveName('');
        setShowSaveDialog(false);
        setSteps([]);
        loadRecordings();
      }
    } catch (e) {
      alert('保存失败：' + e);
    }
  };

  const handlePlay = async (recording: SavedRecording) => {
    setIsPlaying(true);
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_play', { steps: recording.steps });
        // 等待回放时间
        setTimeout(() => setIsPlaying(false), recording.duration_ms + 2000);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_delete', { id });
        loadRecordings();
      }
    } catch { /* ignore */ }
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rec-page">
      {/* 录制控制面板 */}
      <div className="rec-control-panel">
        <div className="rec-control-header">
          <h3>🎬 操作录制</h3>
          <span className="rec-hint">录制鼠标和键盘操作，保存后可重复回放</span>
        </div>

        <div className="rec-control-body">
          {recordingState === 'idle' ? (
            <button className="rec-btn rec-btn-start" onClick={handleStart} disabled={isPlaying}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              开始录制
            </button>
          ) : (
            <div className="rec-active-controls">
              <div className="rec-timer">
                <span className={`rec-dot ${recordingState === 'recording' ? 'active' : 'paused'}`} />
                {formatDuration(timer * 1000)}
                <span className="rec-step-count">{steps.length > 0 ? `${steps.length} 步` : '录制中...'}</span>
              </div>
              <div className="rec-btn-group">
                <button className="rec-btn rec-btn-pause" onClick={handlePause}>
                  {recordingState === 'paused' ? '▶ 继续' : '⏸ 暂停'}
                </button>
                <button className="rec-btn rec-btn-stop" onClick={handleStop}>
                  ⏹ 停止
                </button>
              </div>
            </div>
          )}
        </div>

        {recordingState !== 'idle' && (
          <div className="rec-permission-note">
            ⚠️ macOS 需在「系统设置 → 隐私安全 → 辅助功能」中授权自启精灵
          </div>
        )}
      </div>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="rec-save-dialog">
          <div className="rec-save-dialog-inner">
            <h4>保存录制</h4>
            <p>已录制 {steps.length} 个操作步骤</p>
            <input
              className="rec-save-input"
              placeholder="输入录制名称..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="rec-save-actions">
              <button className="rec-btn rec-btn-cancel" onClick={() => { setShowSaveDialog(false); setSteps([]); }}>
                丢弃
              </button>
              <button className="rec-btn rec-btn-save" onClick={handleSave} disabled={!saveName.trim()}>
                💾 保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 录制后步骤预览 */}
      {steps.length > 0 && !showSaveDialog && (
        <div className="rec-steps-preview">
          <h4>录制步骤（{steps.length}）</h4>
          <div className="rec-steps-list">
            {steps.slice(0, 50).map((step, i) => (
              <div key={i} className="rec-step-item">
                <span className="rec-step-icon">{STEP_ICONS[step.type] || '❓'}</span>
                <span className="rec-step-label">{STEP_LABELS[step.type] || step.type}</span>
                <span className="rec-step-detail">
                  {step.x !== undefined && `(${Math.round(step.x)}, ${Math.round(step.y || 0)})`}
                  {step.key && step.key}
                  {step.button && step.button}
                </span>
                <span className="rec-step-delay">{step.delay_ms}ms</span>
                <button className="rec-step-delete" onClick={() => removeStep(i)}>✕</button>
              </div>
            ))}
            {steps.length > 50 && (
              <div className="rec-step-more">... 还有 {steps.length - 50} 个步骤</div>
            )}
          </div>
        </div>
      )}

      {/* 已保存的录制列表 */}
      <div className="rec-saved-list">
        <h4>📁 已保存的录制（{savedRecordings.length}）</h4>
        {savedRecordings.length === 0 ? (
          <div className="rec-empty">
            <div className="rec-empty-icon">🎬</div>
            <div className="rec-empty-text">暂无录制，点击上方「开始录制」</div>
          </div>
        ) : (
          <div className="rec-cards">
            {savedRecordings.map(rec => (
              <div key={rec.id} className="rec-card">
                <div className="rec-card-header">
                  <span className="rec-card-name">{rec.name}</span>
                  <span className="rec-card-date">{formatDate(rec.created_at)}</span>
                </div>
                <div className="rec-card-info">
                  <span>🕐 {formatDuration(rec.duration_ms)}</span>
                  <span>📝 {rec.step_count} 步</span>
                </div>
                <div className="rec-card-actions">
                  <button
                    className="rec-btn rec-btn-play"
                    onClick={() => handlePlay(rec)}
                    disabled={isPlaying || recordingState !== 'idle'}
                  >
                    {isPlaying ? '⏳ 回放中...' : '▶ 回放'}
                  </button>
                  <button
                    className="rec-btn rec-btn-delete"
                    onClick={() => handleDelete(rec.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingPage;
