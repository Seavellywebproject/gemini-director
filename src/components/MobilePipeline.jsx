import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { useExecutePipeline } from '../hooks/useExecutePipeline';
import { MODELS } from '../data/models';
import {
  Play, Loader2, ChevronDown, ChevronUp, Trash2,
  Image, Film, Type, Mic, Music, FileText, Pencil, Zap, Upload, Link2,
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

// ── Helper: get all nodes that can be a source for this node ──
function getConnectableSources(nodes, nodeOutputs, targetId) {
  return nodes
    .filter(n => n.id !== targetId)
    .map(n => {
      const meta = NODE_ICONS[n.type] || NODE_ICONS.promptNode;
      const output = nodeOutputs[n.id];
      const hasImage = output?.image || (n.type === 'imageInputNode' && n.data?.image);
      const hasPrompt = n.type === 'promptNode';
      const hasText = output?.text || n.type === 'rewriteNode';
      const hasVideo = output?.video;
      const hasAudio = output?.audio;

      // Determine what this node outputs
      const outputTypes = [];
      if (hasPrompt) outputTypes.push('prompt');
      if (hasImage) outputTypes.push('image');
      if (hasText && !hasPrompt) outputTypes.push('text');
      if (hasVideo) outputTypes.push('video');
      if (hasAudio) outputTypes.push('audio');

      // Show a preview tag
      let tag = n.data?.label || meta.label;
      if (output?.image || (n.type === 'imageInputNode' && n.data?.image)) tag += ' 🖼';
      if (hasPrompt && n.data?.text) tag += ` "${n.data.text.slice(0, 20)}…"`;

      return { id: n.id, label: tag, meta, outputTypes, node: n, hasImage };
    });
}

function InputWiring({ node, nodes, edges, nodeOutputs }) {
  const { onConnect } = useFlowStore();

  // Find edges targeting this node
  const incomingEdges = edges.filter(e => e.target === node.id);
  const connectedSourceIds = new Set(incomingEdges.map(e => e.source));

  const sources = getConnectableSources(nodes, nodeOutputs, node.id);

  // Determine which handle types this node accepts
  const acceptsPrompt = ['geminiImageNode', 'geminiVideoNode', 'geminiTextNode', 'geminiSpeechNode', 'geminiMusicNode', 'rewriteNode'].includes(node.type);
  const acceptsImage = ['geminiImageNode', 'geminiVideoNode', 'outputNode'].includes(node.type);
  const acceptsText = ['geminiSpeechNode', 'rewriteNode', 'textOutputNode'].includes(node.type);
  const acceptsVideo = ['outputNode', 'lipSyncNode'].includes(node.type);
  const acceptsAudio = ['outputNode'].includes(node.type);

  const filterSources = sources.filter(s => {
    // Show sources that produce something this node accepts
    if (acceptsPrompt && s.outputTypes.includes('prompt')) return true;
    if (acceptsImage && (s.outputTypes.includes('image') || s.hasImage)) return true;
    if (acceptsText && s.outputTypes.includes('text')) return true;
    if (acceptsVideo && s.outputTypes.includes('video')) return true;
    if (acceptsAudio && s.outputTypes.includes('audio')) return true;
    // Output node accepts everything
    if (node.type === 'outputNode') return true;
    return false;
  });

  const toggleConnection = (sourceId) => {
    const store = useFlowStore.getState();
    if (connectedSourceIds.has(sourceId)) {
      // Disconnect: remove all edges from this source to this target
      const toRemove = edges.filter(e => e.source === sourceId && e.target === node.id);
      if (toRemove.length > 0) {
        store.onEdgesChange(toRemove.map(e => ({ type: 'remove', id: e.id })));
      }
    } else {
      // Connect: determine appropriate handles
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;
      
      let sourceHandle = 'prompt';
      if (sourceNode.type === 'imageInputNode' || sourceNode.type === 'geminiImageNode') sourceHandle = 'image';
      if (sourceNode.type === 'geminiVideoNode') sourceHandle = 'video';
      if (sourceNode.type === 'geminiTextNode' || sourceNode.type === 'rewriteNode') sourceHandle = 'text';
      if (sourceNode.type === 'geminiSpeechNode' || sourceNode.type === 'geminiMusicNode') sourceHandle = 'audio';
      if (sourceNode.type === 'outputNode') sourceHandle = 'image';

      let targetHandle = 'prompt';
      if (sourceHandle === 'image') targetHandle = 'image';
      if (sourceHandle === 'video') targetHandle = 'video';
      if (sourceHandle === 'text') targetHandle = 'text';
      if (sourceHandle === 'audio') targetHandle = 'audio';
      if (sourceHandle === 'prompt') targetHandle = 'prompt';

      store.onConnect({
        source: sourceId,
        sourceHandle,
        target: node.id,
        targetHandle,
      });
    }
  };

  if (filterSources.length === 0) return null;

  return (
    <div className="mp-wiring">
      <div className="mp-wiring-title">
        <Link2 size={13} /> Inputs — Tap to connect
      </div>
      <div className="mp-wiring-list">
        {filterSources.map(source => {
          const isConnected = connectedSourceIds.has(source.id);
          const SourceIcon = source.meta.icon;
          return (
            <button
              key={source.id}
              className={`mp-wire-item ${isConnected ? 'mp-wire-item--active' : ''}`}
              onClick={() => toggleConnection(source.id)}
            >
              <div className="mp-wire-icon" style={{ color: source.meta.color }}>
                <SourceIcon size={14} />
              </div>
              <span className="mp-wire-label">{source.label}</span>
              <span className={`mp-wire-toggle ${isConnected ? 'mp-wire-toggle--on' : ''}`}>
                {isConnected ? '✓' : '+'}
              </span>
            </button>
          );
        })}
      </div>
      {connectedSourceIds.size > 0 && (
        <div className="mp-wiring-count">
          {connectedSourceIds.size} input{connectedSourceIds.size > 1 ? 's' : ''} connected
        </div>
      )}
    </div>
  );
}


function PipelineCard({ node, isExpanded, onToggle, allNodes }) {
  const { nodeSettings, nodeStatuses, nodeOutputs, nodeErrors, edges,
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

  // Does this node accept inputs?
  const canReceiveInputs = !isPromptNode && node.type !== 'imageInputNode';

  // Count connected inputs for badge
  const connectedCount = edges.filter(e => e.target === node.id).length;

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
          <div className="mp-card-title">
            {node.data?.label || meta.label}
            {connectedCount > 0 && <span className="mp-card-badge">{connectedCount} input{connectedCount > 1 ? 's' : ''}</span>}
          </div>
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

          {/* ── INPUT WIRING — tap to connect any node ── */}
          {canReceiveInputs && (
            <InputWiring
              node={node}
              nodes={allNodes}
              edges={edges}
              nodeOutputs={nodeOutputs}
            />
          )}

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
  const { nodes, edges, mobileExpandedNode, setMobileExpandedNode } = useFlowStore();

  // Build connection map for visual connectors
  const getNodeConnections = (nodeId) => {
    return edges.filter(e => e.target === nodeId).map(e => e.source);
  };

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
          {nodes.map((node, i) => {
            const connections = getNodeConnections(node.id);
            const hasExplicitConnections = connections.length > 0;
            // Find source node labels for the connector
            const sourceLabels = connections.map(srcId => {
              const srcNode = nodes.find(n => n.id === srcId);
              const srcMeta = NODE_ICONS[srcNode?.type] || NODE_ICONS.promptNode;
              return srcNode?.data?.label || srcMeta.label;
            });

            return (
              <React.Fragment key={node.id}>
                {/* Show connection lines from wired sources */}
                {hasExplicitConnections && (
                  <div className="mp-connector mp-connector--wired">
                    <div className="mp-connector-line" />
                    <div className="mp-connector-sources">
                      {sourceLabels.map((label, j) => (
                        <span key={j} className="mp-connector-tag">← {label}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Show default arrow if no explicit connections and not first */}
                {!hasExplicitConnections && i > 0 && (
                  <div className="mp-connector">
                    <div className="mp-connector-line mp-connector-line--dim" />
                    <div className="mp-connector-arrow" style={{ opacity: 0.3 }}>↓</div>
                  </div>
                )}
                <PipelineCard
                  node={node}
                  isExpanded={mobileExpandedNode === node.id}
                  onToggle={() => setMobileExpandedNode(node.id)}
                  allNodes={nodes}
                />
              </React.Fragment>
            );
          })}
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
