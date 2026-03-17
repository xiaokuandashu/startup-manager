import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../i18n';
import { Circle, List, Network, Mouse, MousePointer, Keyboard, Brain, Camera, Crosshair, RefreshCw, FolderOpen, Package, FileText, CircleDot, Hexagon, Clock, Edit3, Save, Trash2, AlertTriangle, Square, CheckCircle2, Pause, Video } from 'lucide-react';
import RecordingMindMap from '../components/RecordingMindMap';

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

interface RecordingNode {
  id: string;
  node_type: string;
  label: string;
  enabled: boolean;
  children: string[];
  condition: any;
  action: any;
  delay_ms: number;
  note: string;
}

interface SavedRecording {
  id: string;
  name: string;
  created_at: string;
  duration_ms: number;
  step_count: number;
  steps: RecordedStep[];
  mode?: string;
  nodes?: RecordingNode[];
}

interface RecordingPageProps {
  lang?: Language;
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  action: <CircleDot size={14} color="#3b82f6" />, condition: <Hexagon size={14} color="#f59e0b" />, wait: <Clock size={14} />, loop: <RefreshCw size={14} />, open_app: <FolderOpen size={14} />, sub_flow: <Package size={14} />,
};

const NODE_LABELS: Record<string, string> = {
  action: '操作', condition: '条件', wait: '等待', loop: '循环', open_app: '打开应用', sub_flow: '子流程',
};

const MODE_OPTIONS = [
  { id: 'full', label: <><Mouse size={14} /> 全量</>, desc: '鼠标+键盘' },
  { id: 'mouse_only', label: <><Mouse size={14} /> 仅鼠标</>, desc: '点击/滚轮' },
  { id: 'keyboard_only', label: <><Keyboard size={14} /> 仅键盘</>, desc: '按键输入' },
  { id: 'smart', label: <><Brain size={14} /> 智能</>, desc: '自动过滤' },
  { id: 'screenshot', label: <><Camera size={14} /> 截图</>, desc: '每步截图' },
  { id: 'element', label: <><Crosshair size={14} /> 元素</>, desc: 'UI元素' },
];

const STEP_ICONS: Record<string, React.ReactNode> = {
  mouse_move: <Mouse size={12} />, mouse_click: <MousePointer size={12} />, mouse_release: <MousePointer size={12} />, mouse_scroll: <FileText size={12} />, key_press: <Keyboard size={12} />, key_release: <Keyboard size={12} />,
};

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
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
  const [recordMode, setRecordMode] = useState('full');
  // 节点编辑
  const [editingRec, setEditingRec] = useState<SavedRecording | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragNodeIdx, setDragNodeIdx] = useState<number | null>(null);
  const [editorView, setEditorView] = useState<'list' | 'mindmap'>('list');

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => { loadRecordings(); }, []);

  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  useEffect(() => {
    if (recordingState === 'idle') return;
    const poll = setInterval(async () => {
      try {
        if ((window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const status = await invoke<{ state: string }>('recording_status');
          if (status.state === 'idle') setRecordingState('idle');
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
    } catch (e) { alert('启动录制失败：' + e); }
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
          name: saveName.trim(), steps, durationMs: timer * 1000, mode: recordMode,
        });
        setSaveName(''); setShowSaveDialog(false); setSteps([]); loadRecordings();
      }
    } catch (e) { alert('保存失败：' + e); }
  };

  const handlePlay = async (rec: SavedRecording) => {
    setIsPlaying(true);
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_play', { steps: rec.steps });
        setTimeout(() => setIsPlaying(false), rec.duration_ms + 2000);
      }
    } catch { setIsPlaying(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_delete', { id });
        if (editingRec?.id === id) setEditingRec(null);
        loadRecordings();
      }
    } catch { /* ignore */ }
  };

  // 节点操作
  const handleAddNode = async (nodeType: string) => {
    if (!editingRec) return;
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const afterId = selectedNode || editingRec.nodes?.[editingRec.nodes.length - 1]?.id || '';
        const label = nodeType === 'wait' ? '等待 1000ms' : nodeType === 'condition' ? '条件检测' : nodeType === 'loop' ? '循环' : nodeType === 'open_app' ? '/Applications/' : '新操作';
        const nodes = await invoke<RecordingNode[]>('recording_add_node', {
          id: editingRec.id, afterNodeId: afterId, nodeType, label, delayMs: nodeType === 'wait' ? 1000 : undefined,
        });
        setEditingRec({ ...editingRec, nodes });
      }
    } catch { /* ignore */ }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!editingRec) return;
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const nodes = await invoke<RecordingNode[]>('recording_delete_node', {
          id: editingRec.id, nodeId,
        });
        setEditingRec({ ...editingRec, nodes });
        if (selectedNode === nodeId) setSelectedNode(null);
      }
    } catch { /* ignore */ }
  };

  const handleMoveNode = async (fromIdx: number, toIdx: number) => {
    if (!editingRec) return;
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const nodes = await invoke<RecordingNode[]>('recording_move_node', {
          id: editingRec.id, fromIdx, toIdx,
        });
        setEditingRec({ ...editingRec, nodes });
      }
    } catch { /* ignore */ }
  };

  const handleToggleNode = async (nodeId: string) => {
    if (!editingRec || !editingRec.nodes) return;
    const updated = editingRec.nodes.map(n => n.id === nodeId ? { ...n, enabled: !n.enabled } : n);
    setEditingRec({ ...editingRec, nodes: updated });
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('recording_update_nodes', { id: editingRec.id, nodes: updated });
      }
    } catch { /* ignore */ }
  };

  const selectedNodeData = editingRec?.nodes?.find(n => n.id === selectedNode);

  // ========== 编辑视图 ==========
  if (editingRec) {
    const nodes = editingRec.nodes || [];
    return (
      <div className="rec-page">
        {/* 顶部工具栏 */}
        <div className="rec-editor-toolbar">
          <button className="rec-btn rec-btn-back" onClick={() => { setEditingRec(null); setSelectedNode(null); }}>
            ← 返回
          </button>
          <h3><Edit3 size={14} style={{marginRight:4,verticalAlign:'middle'}} /> 编辑: {editingRec.name}</h3>
          <div className="rec-editor-info">
            {nodes.length} 个节点 · {formatDuration(editingRec.duration_ms)}
          </div>
          <div className="rec-view-toggle">
            <button className={`rec-view-btn ${editorView === 'list' ? 'active' : ''}`} onClick={() => setEditorView('list')} title="列表视图">
              <List size={16} />
            </button>
            <button className={`rec-view-btn ${editorView === 'mindmap' ? 'active' : ''}`} onClick={() => setEditorView('mindmap')} title="脑图视图">
              <Network size={16} />
            </button>
          </div>
        </div>

        {editorView === 'mindmap' ? (
          <div className="rec-editor-body" style={{ height: 'calc(100vh - 160px)' }}>
            <RecordingMindMap
              nodes={nodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onDeleteNode={handleDeleteNode}
              onToggleNode={handleToggleNode}
              onAddNode={handleAddNode}
            />
            {/* 属性面板 */}
            {selectedNodeData && (
              <div className="rec-prop-panel">
                <h4>{NODE_ICONS[selectedNodeData.node_type]} {selectedNodeData.label}</h4>
                <div className="rec-prop-row">
                  <label>类型</label>
                  <span>{NODE_LABELS[selectedNodeData.node_type] || selectedNodeData.node_type}</span>
                </div>
                <div className="rec-prop-row">
                  <label>延迟</label>
                  <span>{selectedNodeData.delay_ms}ms</span>
                </div>
                <div className="rec-prop-row">
                  <label>状态</label>
                  <span>{selectedNodeData.enabled ? <><CheckCircle2 size={12} /> 启用</> : <><Pause size={12} /> 禁用</>}</span>
                </div>
                {selectedNodeData.note && (
                  <div className="rec-prop-row">
                    <label>备注</label>
                    <span>{selectedNodeData.note}</span>
                  </div>
                )}
                {selectedNodeData.condition && (
                  <div className="rec-prop-section">
                    <h5>条件</h5>
                    <div className="rec-prop-row">
                      <label>类型</label>
                      <span>{selectedNodeData.condition.condition_type}</span>
                    </div>
                    <div className="rec-prop-row">
                      <label>超时</label>
                      <span>{selectedNodeData.condition.timeout_ms}ms</span>
                    </div>
                  </div>
                )}
                {selectedNodeData.action?.steps?.length > 0 && (
                  <div className="rec-prop-section">
                    <h5>操作步骤 ({selectedNodeData.action.steps.length})</h5>
                    {selectedNodeData.action.steps.map((s: any, i: number) => (
                      <div key={i} className="rec-prop-step">
                        {STEP_ICONS[s.type] || '•'} {s.type} {s.x !== undefined && `(${Math.round(s.x)},${Math.round(s.y||0)})`} {s.key || ''} {s.button || ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 添加节点工具栏 */}
            <div className="rec-node-toolbar">
              <span className="rec-node-toolbar-label">新增节点:</span>
              {[
                { type: 'action', icon: <CircleDot size={14} color="#3b82f6" />, label: '操作' },
                { type: 'condition', icon: <Hexagon size={14} color="#f59e0b" />, label: '条件' },
                { type: 'wait', icon: <Clock size={14} />, label: '等待' },
                { type: 'loop', icon: <RefreshCw size={14} />, label: '循环' },
                { type: 'open_app', icon: <FolderOpen size={14} />, label: '打开应用' },
              ].map(btn => (
                <button key={btn.type} className="rec-node-add-btn" onClick={() => handleAddNode(btn.type)}>
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>

            <div className="rec-editor-body">
              {/* 节点树列表 */}
              <div className="rec-node-list">
                {nodes.length === 0 ? (
                  <div className="rec-empty">
                    <div className="rec-empty-icon">🌳</div>
                    <div className="rec-empty-text">暂无节点，使用工具栏添加</div>
                  </div>
                ) : nodes.map((node, idx) => (
                  <div
                    key={node.id}
                    className={`rec-node-item ${selectedNode === node.id ? 'selected' : ''} ${!node.enabled ? 'disabled' : ''} ${dragNodeIdx === idx ? 'dragging' : ''}`}
                    draggable
                    onClick={() => setSelectedNode(node.id)}
                    onDragStart={() => setDragNodeIdx(idx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (dragNodeIdx !== null && dragNodeIdx !== idx) handleMoveNode(dragNodeIdx, idx);
                      setDragNodeIdx(null);
                    }}
                    onDragEnd={() => setDragNodeIdx(null)}
                  >
                    <div className="rec-node-drag">⠿</div>
                    <div className="rec-node-connector" />
                    <span className="rec-node-icon">{NODE_ICONS[node.node_type] || '❓'}</span>
                    <div className="rec-node-info">
                      <div className="rec-node-label">{node.label}</div>
                      <div className="rec-node-meta">
                        {NODE_LABELS[node.node_type] || node.node_type}
                        {node.delay_ms > 0 && ` · ${node.delay_ms}ms`}
                      </div>
                    </div>
                    <div className="rec-node-actions">
                      <button className={`rec-node-toggle ${node.enabled ? '' : 'off'}`} onClick={e => { e.stopPropagation(); handleToggleNode(node.id); }}>
                        {node.enabled ? '✓' : '○'}
                      </button>
                      <button className="rec-node-del" onClick={e => { e.stopPropagation(); handleDeleteNode(node.id); }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 属性面板 */}
              {selectedNodeData && (
                <div className="rec-prop-panel">
                  <h4>{NODE_ICONS[selectedNodeData.node_type]} {selectedNodeData.label}</h4>
                  <div className="rec-prop-row">
                    <label>类型</label>
                    <span>{NODE_LABELS[selectedNodeData.node_type] || selectedNodeData.node_type}</span>
                  </div>
                  <div className="rec-prop-row">
                    <label>延迟</label>
                    <span>{selectedNodeData.delay_ms}ms</span>
                  </div>
                  <div className="rec-prop-row">
                    <label>状态</label>
                    <span>{selectedNodeData.enabled ? <><CheckCircle2 size={12} /> 启用</> : <><Pause size={12} /> 禁用</>}</span>
                  </div>
                  {selectedNodeData.note && (
                    <div className="rec-prop-row">
                      <label>备注</label>
                      <span>{selectedNodeData.note}</span>
                    </div>
                  )}
                  {selectedNodeData.condition && (
                    <div className="rec-prop-section">
                      <h5>条件规则</h5>
                      <div className="rec-prop-row">
                        <label>规则类型</label>
                        <span>{selectedNodeData.condition.rule_type}</span>
                      </div>
                      <div className="rec-prop-row">
                        <label>检测目标</label>
                        <span>{selectedNodeData.condition.target || '未设置'}</span>
                      </div>
                      <div className="rec-prop-row">
                        <label>超时</label>
                        <span>{selectedNodeData.condition.timeout_ms}ms</span>
                      </div>
                    </div>
                  )}
                  {selectedNodeData.action?.steps?.length > 0 && (
                    <div className="rec-prop-section">
                      <h5>操作步骤 ({selectedNodeData.action.steps.length})</h5>
                      {selectedNodeData.action.steps.map((s: any, i: number) => (
                        <div key={i} className="rec-prop-step">
                          {STEP_ICONS[s.type] || '•'} {s.type} {s.x !== undefined && `(${Math.round(s.x)},${Math.round(s.y||0)})`} {s.key || ''} {s.button || ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ========== 主视图（录制 + 列表）==========
  return (
    <div className="rec-page">
      {/* 录制控制面板 */}
      <div className="rec-control-panel">
        <div className="rec-control-header">
          <h3><Video size={16} style={{marginRight:4,verticalAlign:'middle'}} /> 操作录制</h3>
          <span className="rec-hint">录制鼠标和键盘操作，保存后可编辑和回放</span>
        </div>

        {/* 录制模式选择 */}
        {recordingState === 'idle' && (
          <div className="rec-mode-selector">
            {MODE_OPTIONS.map(m => (
              <button
                key={m.id}
                className={`rec-mode-btn ${recordMode === m.id ? 'active' : ''}`}
                onClick={() => setRecordMode(m.id)}
              >
                <span className="rec-mode-label">{m.label}</span>
                <span className="rec-mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        )}

        <div className="rec-control-body">
          {recordingState === 'idle' ? (
            <button className="rec-btn rec-btn-start" onClick={handleStart} disabled={isPlaying}>
              <Circle size={20} fill="currentColor" />
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
                <button className="rec-btn rec-btn-stop" onClick={handleStop}><Square size={14} style={{marginRight:3}} /> 停止</button>
              </div>
            </div>
          )}
        </div>

        {recordingState !== 'idle' && (
          <div className="rec-permission-note"><AlertTriangle size={14} style={{marginRight:4,verticalAlign:'middle'}} /> macOS 需在「系统设置 → 隐私安全 → 辅助功能」中授权</div>
        )}
      </div>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="rec-save-dialog">
          <div className="rec-save-dialog-inner">
            <h4>保存录制</h4>
            <p>已录制 {steps.length} 个操作步骤（{MODE_OPTIONS.find(m => m.id === recordMode)?.label}模式）</p>
            <input
              className="rec-save-input"
              placeholder="输入录制名称..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="rec-save-actions">
              <button className="rec-btn rec-btn-cancel" onClick={() => { setShowSaveDialog(false); setSteps([]); }}>丢弃</button>
              <button className="rec-btn rec-btn-save" onClick={handleSave} disabled={!saveName.trim()}><Save size={14} style={{marginRight:3}} /> 保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 已保存的录制列表 */}
      <div className="rec-saved-list">
        <h4><FolderOpen size={14} style={{marginRight:4,verticalAlign:'middle'}} /> 已保存的录制（{savedRecordings.length}）</h4>
        {savedRecordings.length === 0 ? (
          <div className="rec-empty">
            <div className="rec-empty-icon"><Video size={48} color="#9ca3af" /></div>
            <div className="rec-empty-text">暂无录制，选择模式后点击「开始录制」</div>
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
                  <span><FileText size={12} style={{marginRight:2}} /> {rec.step_count} 步</span>
                  {rec.nodes && rec.nodes.length > 0 && <span>🌳 {rec.nodes.length} 节点</span>}
                </div>
                <div className="rec-card-actions">
                  <button className="rec-btn rec-btn-edit" onClick={() => { setEditingRec(rec); setSelectedNode(null); }}>
                    <Edit3 size={12} style={{marginRight:2}} /> 编辑
                  </button>
                  <button className="rec-btn rec-btn-play" onClick={() => handlePlay(rec)} disabled={isPlaying || recordingState !== 'idle'}>
                    {isPlaying ? '⏳ 回放中...' : '▶ 回放'}
                  </button>
                  <button className="rec-btn rec-btn-delete" onClick={() => handleDelete(rec.id)}><Trash2 size={14} /></button>
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
