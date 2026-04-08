import React from 'react';
import { Handle, Position } from 'reactflow';
import { useFlowStore } from '../store/useFlowStore';
import { Type } from 'lucide-react';

export default function PromptNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();

  return (
    <div className={`node node--prompt ${selected ? 'node--selected' : ''}`}>
      <div className="node-header">
        <div className="node-icon node-icon--prompt"><Type size={12} /></div>
        <span className="node-title">Prompt</span>
      </div>
      <div className="node-body">
        <textarea
          className="node-textarea nodrag nopan"
          value={data.text || ''}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          placeholder="Enter your prompt here..."
          rows={4}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
      <div className="node-footer">
        <span className="char-count">{(data.text || '').length} chars</span>
        <button className="node-add-btn" onClick={() => {}}>+ Add variant</button>
      </div>
      {/* Output: prompt string */}
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        className="handle handle--prompt"
        style={{ top: '50%' }}
      />
    </div>
  );
}
