import React, { useState, ReactNode } from 'react';
import { ToolType } from '../types';
import { Bot, Clapperboard, Store, ScrollText } from 'lucide-react';

interface ToolCard {
  type: ToolType;
  icon: ReactNode;
  title: string;
  desc: string;
  color: string;
}

const DEFAULT_TOOLS: ToolCard[] = [
  { type: 'ai', icon: <Bot size={28} />, title: 'AI 助手', desc: '智能对话，自然语言创建任务', color: '#3b82f6' },
  { type: 'recording', icon: <Clapperboard size={28} />, title: '操作录制', desc: '录制操作流程，一键回放', color: '#8b5cf6' },
  { type: 'marketplace', icon: <Store size={28} />, title: '任务市场', desc: '发现和分享自动化任务', color: '#f59e0b' },
  { type: 'log', icon: <ScrollText size={28} />, title: '运行日志', desc: '查看任务执行记录', color: '#10b981' },
];

const STORAGE_KEY = 'tools_order';

function loadOrder(): ToolCard[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const order: ToolType[] = JSON.parse(saved);
      const sorted: ToolCard[] = [];
      for (const type of order) {
        const found = DEFAULT_TOOLS.find(t => t.type === type);
        if (found) sorted.push(found);
      }
      for (const t of DEFAULT_TOOLS) {
        if (!sorted.find(s => s.type === t.type)) sorted.push(t);
      }
      return sorted;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_TOOLS];
}

function saveOrder(tools: ToolCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools.map(t => t.type)));
}

interface ToolsPageProps {
  onOpenTool: (type: ToolType) => void;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ onOpenTool }) => {
  const [tools, setTools] = useState<ToolCard[]>(loadOrder);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const isDraggingRef = React.useRef(false);

  return (
    <div className="tools-page">
      <div className="tools-header">
        <h3>工具箱</h3>
        <span className="tools-subtitle">点击打开工具，拖拽调整顺序</span>
      </div>
      <div className="tools-grid">
        {tools.map((tool, idx) => (
          <div
            key={tool.type}
            className={`tool-card ${dragIdx === idx ? 'dragging' : ''} ${dragOverIdx === idx ? 'drag-over' : ''}`}
            draggable
            onClick={() => {
              // 拖拽结束后不触发 click
              if (isDraggingRef.current) { isDraggingRef.current = false; return; }
              onOpenTool(tool.type);
            }}
            onDragStart={e => {
              isDraggingRef.current = true;
              setDragIdx(idx);
              // Windows WebView2 必须设置 dataTransfer 才能正常拖拽
              e.dataTransfer.setData('text/plain', String(idx));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(idx); }}
            onDragLeave={() => { if (dragOverIdx === idx) setDragOverIdx(null); }}
            onDrop={e => {
              e.preventDefault();
              if (dragIdx !== null && dragIdx !== idx) {
                const arr = [...tools];
                const [moved] = arr.splice(dragIdx, 1);
                arr.splice(idx, 0, moved);
                setTools(arr);
                saveOrder(arr);
              }
              setDragIdx(null);
              setDragOverIdx(null);
            }}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); setTimeout(() => { isDraggingRef.current = false; }, 100); }}
            style={{ '--tool-color': tool.color } as React.CSSProperties}
          >
            <div className="tool-card-drag">⠿</div>
            <div className="tool-card-icon">{tool.icon}</div>
            <div className="tool-card-info">
              <div className="tool-card-title">{tool.title}</div>
              <div className="tool-card-desc">{tool.desc}</div>
            </div>
            <div className="tool-card-arrow">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
