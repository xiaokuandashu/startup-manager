import React from 'react';
import { ToolType } from '../types';

interface ToolCard {
  type: ToolType;
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const TOOLS: ToolCard[] = [
  { type: 'ai', icon: '🤖', title: 'AI 助手', desc: '智能对话，自然语言创建任务', color: '#3b82f6' },
  { type: 'recording', icon: '🎬', title: '操作录制', desc: '录制操作流程，一键回放', color: '#8b5cf6' },
  { type: 'marketplace', icon: '🏪', title: '任务市场', desc: '发现和分享自动化任务', color: '#f59e0b' },
  { type: 'log', icon: '📋', title: '运行日志', desc: '查看任务执行记录', color: '#10b981' },
];

interface ToolsPageProps {
  onOpenTool: (type: ToolType) => void;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ onOpenTool }) => {
  return (
    <div className="tools-page">
      <div className="tools-header">
        <h3>🔧 工具箱</h3>
        <span className="tools-subtitle">点击打开工具，每个工具在独立标签页中运行</span>
      </div>
      <div className="tools-grid">
        {TOOLS.map(tool => (
          <div
            key={tool.type}
            className="tool-card"
            onClick={() => onOpenTool(tool.type)}
            style={{ '--tool-color': tool.color } as React.CSSProperties}
          >
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
