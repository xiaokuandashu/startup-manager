import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Trash2, Plus, ChevronDown, ChevronRight, Power, PowerOff } from 'lucide-react';

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

interface RecordingMindMapProps {
  nodes: RecordingNode[];
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
  onDeleteNode: (id: string) => void;
  onToggleNode: (id: string) => void;
  onAddNode: (type: string) => void;
}

const NODE_COLORS: Record<string, string> = {
  action: '#3b82f6',
  condition: '#f59e0b',
  wait: '#6366f1',
  loop: '#10b981',
  open_app: '#8b5cf6',
  sub_flow: '#ec4899',
};

const NODE_LABELS: Record<string, string> = {
  action: '操作', condition: '条件', wait: '等待',
  loop: '循环', open_app: '打开应用', sub_flow: '子流程',
};

// Custom node component for React Flow
function MindMapNode({ data, selected }: NodeProps) {
  const { recNode, onDelete, onToggle, collapsed, onToggleCollapse } = data as any;
  const color = NODE_COLORS[recNode.node_type] || '#6b7280';
  const hasChildren = recNode.children && recNode.children.length > 0;

  return (
    <div
      className={`mindmap-node ${selected ? 'selected' : ''} ${!recNode.enabled ? 'disabled' : ''}`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div className="mindmap-node-header" style={{ background: color }}>
        <span className="mindmap-node-type">{NODE_LABELS[recNode.node_type] || recNode.node_type}</span>
        <div className="mindmap-node-btns">
          {hasChildren && (
            <button className="mindmap-btn" onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(); }}>
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <button className="mindmap-btn" onClick={(e) => { e.stopPropagation(); onToggle?.(recNode.id); }}>
            {recNode.enabled ? <Power size={12} /> : <PowerOff size={12} />}
          </button>
          <button className="mindmap-btn del" onClick={(e) => { e.stopPropagation(); onDelete?.(recNode.id); }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="mindmap-node-body">
        <div className="mindmap-node-label">{recNode.label}</div>
        {recNode.delay_ms > 0 && <div className="mindmap-node-delay">{recNode.delay_ms}ms</div>}
        {recNode.note && <div className="mindmap-node-note">{recNode.note}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { mindmapNode: MindMapNode };

const RecordingMindMap: React.FC<RecordingMindMapProps> = ({
  nodes: recNodes,
  selectedNode,
  onSelectNode,
  onDeleteNode,
  onToggleNode,
  onAddNode,
}) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Convert recording nodes to React Flow nodes and edges
  const { flowNodes, flowEdges } = useMemo(() => {
    const fNodes: Node[] = [];
    const fEdges: Edge[] = [];

    // Find which nodes are hidden due to collapsed parents
    const hiddenNodes = new Set<string>();
    const markHidden = (parentId: string) => {
      const parent = recNodes.find(n => n.id === parentId);
      if (!parent) return;
      for (const childId of parent.children || []) {
        hiddenNodes.add(childId);
        markHidden(childId);
      }
    };
    for (const nodeId of Array.from(collapsedNodes)) {
      markHidden(nodeId);
    }

    // Layout: vertical tree
    const Y_GAP = 120;
    const visibleNodes = recNodes.filter(n => !hiddenNodes.has(n.id));

    // Simple layout: arrange in a vertical line, with branching for children
    visibleNodes.forEach((node, idx) => {
      fNodes.push({
        id: node.id,
        type: 'mindmapNode',
        position: { x: 250, y: idx * Y_GAP },
        selected: selectedNode === node.id,
        data: {
          recNode: node,
          onDelete: onDeleteNode,
          onToggle: onToggleNode,
          collapsed: collapsedNodes.has(node.id),
          onToggleCollapse: () => toggleCollapse(node.id),
        },
      });

      // Create edges for children
      if (node.children && !collapsedNodes.has(node.id)) {
        node.children.forEach(childId => {
          if (!hiddenNodes.has(childId)) {
            fEdges.push({
              id: `e-${node.id}-${childId}`,
              source: node.id,
              target: childId,
              animated: true,
              style: { stroke: NODE_COLORS[node.node_type] || '#6b7280', strokeWidth: 2 },
            });
          }
        });
      }

      // Sequential edge (connect in order)
      if (idx > 0) {
        const prevNode = visibleNodes[idx - 1];
        // Only add sequential edge if not already connected by parent-child
        const alreadyConnected = fEdges.some(e =>
          (e.source === prevNode.id && e.target === node.id) ||
          (e.source === node.id && e.target === prevNode.id)
        );
        if (!alreadyConnected) {
          fEdges.push({
            id: `seq-${prevNode.id}-${node.id}`,
            source: prevNode.id,
            target: node.id,
            style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 5' },
          });
        }
      }
    });

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [recNodes, selectedNode, collapsedNodes, onDeleteNode, onToggleNode, toggleCollapse]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync when recording nodes change
  React.useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode],
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div className="mindmap-container">
      {/* Quick add toolbar */}
      <div className="mindmap-quick-add">
        {['action', 'condition', 'wait', 'loop', 'open_app'].map(type => (
          <button
            key={type}
            className="mindmap-add-btn"
            onClick={() => onAddNode(type)}
            style={{ borderColor: NODE_COLORS[type] }}
          >
            <Plus size={12} /> {NODE_LABELS[type]}
          </button>
        ))}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap
          nodeColor={(n) => NODE_COLORS[(n.data as any)?.recNode?.node_type] || '#6b7280'}
          style={{ background: 'var(--bg-primary, #f1f5f9)' }}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      {/* Stats */}
      <div className="mindmap-stats">
        {recNodes.length} 个节点 · {collapsedNodes.size} 个已折叠
      </div>
    </div>
  );
};

export default RecordingMindMap;
