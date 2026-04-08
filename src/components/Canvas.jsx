import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Controls,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '../store/useFlowStore';
import ContextMenu from './ContextMenu';
import BottomToolbar from './BottomToolbar';
import PromptNode from '../nodes/PromptNode';
import ImageInputNode from '../nodes/ImageInputNode';
import GeminiImageNode from '../nodes/GeminiImageNode';
import GeminiVideoNode from '../nodes/GeminiVideoNode';
import GeminiTextNode from '../nodes/GeminiTextNode';
import GeminiSpeechNode, { GeminiMusicNode } from '../nodes/GeminiSpeechNode';
import OutputNode from '../nodes/OutputNode';
import RewriteNode from '../nodes/RewriteNode';
import LipSyncNode from '../nodes/LipSyncNode';
import { Plus } from 'lucide-react';

const nodeTypes = {
  promptNode: PromptNode,
  imageInputNode: ImageInputNode,
  geminiImageNode: GeminiImageNode,
  geminiVideoNode: GeminiVideoNode,
  geminiTextNode: GeminiTextNode,
  geminiSpeechNode: GeminiSpeechNode,
  geminiMusicNode: GeminiMusicNode,
  outputNode: OutputNode,
  textOutputNode: OutputNode,
  rewriteNode: RewriteNode,
  lipSyncNode: LipSyncNode,
};

export default function Canvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    activeTool, setActiveTool,
    selectedNodeIds, selectedEdgeIds, setSelectedItems,
    contextMenu, openContextMenu, closeContextMenu,
    undo, redo, deleteSelected,
    pushHistory,
  } = useFlowStore();

  const { project } = useReactFlow();
  const canvasRef = useRef(null);
  const longPressTimer = useRef(null);
  const [isMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

  // Pan mode when hand tool active
  const panOnDrag = activeTool === 'hand';

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeIds.length || selectedEdgeIds?.length)) deleteSelected();
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeIds, selectedEdgeIds, setActiveTool, deleteSelected, undo, redo]);

  // Space = temporary hand tool
  useEffect(() => {
    let prev = null;
    const down = (e) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (prev === null) prev = activeTool;
        setActiveTool('hand');
      }
    };
    const up = (e) => {
      if (e.code === 'Space' && prev !== null) {
        setActiveTool(prev);
        prev = null;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [activeTool, setActiveTool]);

  // ── Right-click (desktop) ──────────────────────────────────────
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    const bounds = canvasRef.current?.getBoundingClientRect();
    const flowPos = project({ x: e.clientX - (bounds?.left || 0), y: e.clientY - (bounds?.top || 0) });
    openContextMenu(e.clientX, e.clientY, flowPos.x, flowPos.y);
  }, [project, openContextMenu]);

  // ── Long press (mobile) ────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      const bounds = canvasRef.current?.getBoundingClientRect();
      const flowPos = project({ x: touch.clientX - (bounds?.left || 0), y: touch.clientY - (bounds?.top || 0) });
      openContextMenu(touch.clientX, touch.clientY, flowPos.x, flowPos.y);
    }, 600);
  }, [isMobile, project, openContextMenu]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onTouchMove = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // ── Mobile FAB: opens context menu at center ───────────────────
  const handleMobileFab = useCallback(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const bounds = canvasRef.current?.getBoundingClientRect();
    const flowPos = project({ x: cx - (bounds?.left || 0), y: cy - (bounds?.top || 0) });
    openContextMenu(cx, cy, flowPos.x, flowPos.y);
  }, [project, openContextMenu]);

  const onPaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    setSelectedItems(selectedNodes.map((n) => n.id), selectedEdges.map((e) => e.id));
  }, [setSelectedItems]);

  const handleConnect = useCallback((params) => {
    onConnect(params);
    setTimeout(pushHistory, 0);
  }, [onConnect, pushHistory]);

  return (
    <div
      ref={canvasRef}
      className="canvas-wrapper"
      style={{ cursor: activeTool === 'hand' ? 'grab' : 'default' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onContextMenu={onContextMenu}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        panOnDrag={panOnDrag}
        selectionOnDrag={!panOnDrag}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        fitView
        deleteKeyCode={null}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        style={{ background: '#0a0a0a' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1f1f1f"
          gap={24}
          size={1.5}
        />
        <MiniMap
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 8,
          }}
          nodeColor={(n) => {
            const map = {
              promptNode: '#8b5cf6',
              imageInputNode: '#22c55e',
              geminiImageNode: '#3b82f6',
              geminiVideoNode: '#f97316',
              geminiTextNode: '#e2e8f0',
              geminiSpeechNode: '#eab308',
              geminiMusicNode: '#ec4899',
              outputNode: '#374151',
              rewriteNode: '#10b981',
            };
            return map[n.type] || '#444';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Bottom toolbar */}
      <BottomToolbar />

      {/* Mobile FAB — Add Node button */}
      {isMobile && !contextMenu && (
        <button className="mobile-fab" onClick={handleMobileFab}>
          <Plus size={24} />
        </button>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowX={contextMenu.flowX}
          flowY={contextMenu.flowY}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
