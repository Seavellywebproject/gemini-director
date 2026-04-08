import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { useExecutePipeline } from '../hooks/useExecutePipeline';
import { MODELS } from '../data/models';
import {
  Play, Loader2, ChevronDown, ChevronUp, Trash2,
  Image, Film, Type, Mic, Music, FileText, Pencil, Zap, Upload,
} from 'lucide-react';

const RESOLUTIONS = ['512px', '1K', '2K', '4K'];
const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'];
const VIDEO_DURATIONS = [4, 5, 8, 10, 15];

const NODE_ICONS = {
  promptNode: { icon: Pencil, color: '#8b5cf6', label: 'Prompt' },
  imageInputNode: { icon: Upload, color: '#22c55e', label: 'Image Input' },
  geminiImageNode: { icon: Image, color: '#3b82f6', label: 'Image Gen' },
  geminiVideoNode: { icon: Film, color: '#f97316', label: 'Video Gen' },
  geminiTextNode: { icon: Type, color: '#e2e8f0', label: 'Text Gen' },
  geminiSpeechNode: { icon: Mic, color: '#eab308', label: 'Speech' },
  geminiMusicNode: { icon: Music, color: '#ec4899', label: 'Music' },
  outputNode: { icon: FileText, color: '#6b7280', label: 'Output' },
  textOutputNode: { icon: FileText, color: '#6b7280', label: 'Text Output' },
  rewriteNode: { icon: Pencil, color: '#10b981', label: 'Rewrite' },
  lipSyncNode: { icon: Mic, color: '#f43f5e', label: 'LipSync' },
};

function PipelineCard({ node, isExpanded, onToggle }) {
  const { nodeSettings, nodeStatuses, nodeOutputs, nodeErrors,
    updateNodeSettings, deleteSelected, setSelectedItems } = useFlowStore();
  const { executeSingle } = useExecutePipeline();

  const settings = nodeSettings[node.id] || {};
  const status = nodeStatuses[node.id] || 'idle';
  const output = nodeOutputs[node.id];
  const error = nodeErrors[node.id];
  const meta = NODE_ICONS[node.type] || NODE_ICONS.promptNode;
  const Icon = meta.icon;

  const isImageNode = node.type === 'geminiImageNode';
  const isVideoNode = node.type === 'geminiVideoNode';
  const isTextNode = node.type === 'geminiTextNode';
  const isSpeechNode = node.type === 'geminiSpeechNode';
  const isMusicNode = node.type === 'geminiMusicNode';
  const isPromptNode = node.type === 'promptNode';

  const modelOptions = isImageNode ? MODELS.image
    : isVideoNode ? MODELS.video
    : isTextNode ? MODELS.text
    : isSpeechNode ? MODELS.audio
    : isMusicNode ? MODELS.music
    : [];

  const update = (key, val) => updateNodeSettings(node.id, { [key]: val });

  const handleRun = async (e) => {
    e.stopPropagation();
    if (status === 'loading') return;
    await executeSingle(node.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setSelectedItems([node.id], []);
    setTimeout(() => deleteSelected(), 0);
  };

  return (
    <div className={`mp-card ${isExpanded ? 'mp-card--expanded' : ''} ${status === 'loading' ? 'mp-card--loading' : ''} ${status === 'error' ? 'mp-card--error' : ''}`}>
      {/* Card Header — always visible */}
      <div className="mp-card-header" onClick={onToggle}>
        <div className="mp-card-icon" style={{ background: meta.color + '22', color: meta.color }}>
          <Icon size={16} />
        </div>
        <div className="mp-card-info">
          <div className="mp-card-title">{node.data?.label || meta.label}</div>
          <div className="mp-card-subtitle">
            {isPromptNode && (node.data?.text ? node.data.text.slice(0, 40) + '…' : 'Empty prompt')}
            {isImageNode && `${settings.aspectRatio || '16:9'} · ${settings.resolution || '1K'}`}
            {isVideoNode && `${settings.duration || 8}s · ${settings.aspectRatio || '16:9'}`}
            {isTextNode && `Temp ${settings.temperature || 1}`}
            {isSpeechNode && `Voice: ${settings.voice || 'Alloy'}`}
            {isMusicNode && `${settings.duration || 30}s`}
            {node.type === 'outputNode' && (output?.image ? '✅ Has output' : 'Waiting...')}
            {node.type === 'imageInputNode' && (node.data?.image ? '✅ Image loaded' : 'No image')}
          </div>
        </div>
        <div className="mp-card-actions">
          {status === 'loading' ? (
            <Loader2 size={16} className="spin" />
          ) : (
            !isPromptNode && node.type !== 'imageInputNode' && (
              <button className="mp-run-btn" onClick={handleRun}>
                <Play size={12} /> Run
              </button>
            )
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Status indicator */}
      {status === 'error' && error && (
        <div className="mp-card-error">⚠️ {error}</div>
      )}

      {/* Output preview */}
      {output?.image && (
        <div className="mp-card-preview">
          <img src={output.image} alt="output" />
        </div>
      )}
      {output?.video && (
        <div className="mp-card-preview">
          <video src={output.video} controls playsInline style={{ width: '100%', borderRadius: 8 }} />
        </div>
      )}
      {output?.text && !output?.image && !output?.video && (
        <div className="mp-card-text-preview">{output.text.slice(0, 200)}…</div>
      )}
      {output?.audio && (
        <div className="mp-card-preview">
          <audio src={output.audio} controls style={{ width: '100%' }} />
        </div>
      )}

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="mp-card-settings">
          {/* Image Input — upload */}
          {node.type === 'imageInputNode' && (
            <div className="mp-field">
              <label>Upload Image</label>
              {node.data?.image && (
                <div className="mp-card-preview" style={{ marginBottom: 8 }}>
                  <img src={node.data.image} alt="uploaded" />
                </div>
              )}
              <button
                className="mp-upload-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (ev) => {
                    const file = ev.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result;
                      useFlowStore.getState().updateNodeData(node.id, { image: dataUrl, filename: file.name });
                      useFlowStore.getState().setNodeOutput(node.id, { image: dataUrl });
                    };
                    reader.readAsDataURL(file);
                  };
                  input.click();
                }}
              >
                <Upload size={16} />
                {node.data?.image ? 'Change Image' : 'Choose Image'}
              </button>
            </div>
          )}

          {/* Prompt text */}
          {isPromptNode && (
            <div className="mp-field">
              <label>Prompt Text</label>
              <textarea
                rows={4}
                value={node.data?.text || ''}
                onChange={(e) => {
                  useFlowStore.getState().updateNodeData(node.id, { text: e.target.value });
                }}
                placeholder="Describe the scene..."
              />
            </div>
          )}

          {/* Model picker */}
          {modelOptions.length > 0 && (
            <div className="mp-field">
              <label>Model</label>
              <select value={settings.model || ''} onChange={(e) => update('model', e.target.value)}>
                {modelOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Aspect Ratio */}
          {(isImageNode || isVideoNode) && (
            <div className="mp-field">
              <label>Aspect Ratio</label>
              <div className="mp-chips">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r}
                    className={`mp-chip ${(settings.aspectRatio || '16:9') === r ? 'mp-chip--active' : ''}`}
                    onClick={() => update('aspectRatio', r)}
                  >{r}</button>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          {isImageNode && (
            <div className="mp-field">
              <label>Resolution</label>
              <div className="mp-chips">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r}
                    className={`mp-chip ${(settings.resolution || '1K') === r ? 'mp-chip--active' : ''}`}
                    onClick={() => update('resolution', r)}
                  >{r}</button>
                ))}
              </div>
            </div>
          )}

          {/* Duration */}
          {(isVideoNode || isMusicNode) && (
            <div className="mp-field">
              <label>Duration</label>
              <div className="mp-chips">
                {VIDEO_DURATIONS.map((d) => (
                  <button
                    key={d}
                    className={`mp-chip ${(settings.duration || 8) === d ? 'mp-chip--active' : ''}`}
                    onClick={() => update('duration', d)}
                  >{d}s</button>
                ))}
              </div>
            </div>
          )}

          {/* Temperature */}
          {isTextNode && (
            <div className="mp-field">
              <label>Temperature: {(settings.temperature || 1).toFixed(1)}</label>
              <input
                type="range" min="0" max="2" step="0.1"
                value={settings.temperature || 1}
                onChange={(e) => update('temperature', parseFloat(e.target.value))}
              />
            </div>
          )}

          {/* Voice */}
          {isSpeechNode && (
            <div className="mp-field">
              <label>Voice</label>
              <select value={settings.voice || 'Alloy'} onChange={(e) => update('voice', e.target.value)}>
                {['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {/* Number of images */}
          {isImageNode && (
            <div className="mp-field">
              <label>Images</label>
              <div className="mp-chips">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`mp-chip ${(settings.numberOfImages || 1) === n ? 'mp-chip--active' : ''}`}
                    onClick={() => update('numberOfImages', n)}
                  >{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Delete button */}
          <button className="mp-delete-btn" onClick={handleDelete}>
            <Trash2 size={14} /> Remove Step
          </button>
        </div>
      )}
    </div>
  );
}

export default function MobilePipeline({ onAddStep }) {
  const { nodes, mobileExpandedNode, setMobileExpandedNode } = useFlowStore();

  return (
    <div className="mp-container">
      {nodes.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty-icon">🎬</div>
          <h3>No steps yet</h3>
          <p>Tap the button below to add your first step</p>
          <button className="mp-empty-add" onClick={onAddStep}>
            + Add First Step
          </button>
        </div>
      ) : (
        <div className="mp-list">
          {nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <PipelineCard
                node={node}
                isExpanded={mobileExpandedNode === node.id}
                onToggle={() => setMobileExpandedNode(node.id)}
              />
              {i < nodes.length - 1 && (
                <div className="mp-connector">
                  <div className="mp-connector-line" />
                  <div className="mp-connector-arrow">↓</div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Floating add button at bottom */}
      {nodes.length > 0 && (
        <button className="mp-add-step-btn" onClick={onAddStep}>
          + Add Step
        </button>
      )}
    </div>
  );
}
