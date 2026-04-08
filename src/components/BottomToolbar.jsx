import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import {
  MousePointer2, Hand, Undo2, Redo2, ZoomIn, ZoomOut,
  Maximize2, Trash2, Save, FolderOpen,
} from 'lucide-react';
import { useReactFlow } from 'reactflow';

export default function BottomToolbar() {
  const { activeTool, setActiveTool, undo, redo, canUndo, canRedo,
    deleteSelected, selectedNodeIds, exportPipeline, clearCanvas } = useFlowStore();
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = React.useState(100);

  // Poll zoom level
  React.useEffect(() => {
    const interval = setInterval(() => {
      const z = getZoom?.();
      if (z) setZoom(Math.round(z * 100));
    }, 200);
    return () => clearInterval(interval);
  }, [getZoom]);

  const handleSave = () => {
    const json = exportPipeline();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      useFlowStore.getState().importPipeline(text);
    };
    input.click();
  };

  return (
    <div className="bottom-toolbar">
      {/* Tool Group */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${activeTool === 'select' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setActiveTool('select')}
          title="Select (V)"
        >
          <MousePointer2 size={16} />
        </button>
        <button
          className={`toolbar-btn ${activeTool === 'hand' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setActiveTool('hand')}
          title="Hand (H)"
        >
          <Hand size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Undo/Redo */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Zoom */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => zoomOut()} title="Zoom Out (Ctrl+-)">
          <ZoomOut size={16} />
        </button>
        <span className="zoom-display">{zoom}%</span>
        <button className="toolbar-btn" onClick={() => zoomIn()} title="Zoom In (Ctrl+=)">
          <ZoomIn size={16} />
        </button>
        <button className="toolbar-btn" onClick={() => fitView({ padding: 0.2 })} title="Fit View (Ctrl+0)">
          <Maximize2 size={15} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Save / Load */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleSave} title="Save Pipeline (Ctrl+S)">
          <Save size={15} />
        </button>
        <button className="toolbar-btn" onClick={handleLoad} title="Load Pipeline">
          <FolderOpen size={15} />
        </button>
      </div>

      {/* Delete (only when something selected) */}
      {selectedNodeIds.length > 0 && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <button
              className="toolbar-btn toolbar-btn--danger"
              onClick={deleteSelected}
              title="Delete Selected (Del)"
            >
              <Trash2 size={15} />
              <span style={{ fontSize: 11, marginLeft: 4 }}>
                Delete {selectedNodeIds.length > 1 ? `(${selectedNodeIds.length})` : ''}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
