import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { MODELS } from '../data/models';
import { X, ChevronDown, Play, Minus, Plus, Zap, Settings, Loader2 } from 'lucide-react';
import { useExecutePipeline } from '../hooks/useExecutePipeline';

const RESOLUTIONS = ['512px', '1K', '2K', '4K'];
const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '2:3', '3:2'];
const VIDEO_DURATIONS = [5, 8, 10, 15, 30];

export default function RightPanel() {
  const { selectedNodeIds, nodes, nodeSettings, nodeStatuses, updateNodeSettings, setNodeStatus } = useFlowStore();
  const { executeSingle } = useExecutePipeline();
  const [runCount, setRunCount] = useState(1);

  const selectedId = selectedNodeIds[0];
  const selectedNode = nodes.find((n) => n.id === selectedId);
  const settings = nodeSettings[selectedId] || {};
  const status = nodeStatuses[selectedId] || 'idle';

  if (!selectedNode) {
    return (
      <div className="right-panel right-panel--empty">
        <div className="right-panel-hint">
          <Settings size={24} />
          <p>Select a node to view settings</p>
        </div>
      </div>
    );
  }

  const nodeType = selectedNode.type;
  const modelData = selectedNode.data?.model;

  const isImageNode = nodeType === 'geminiImageNode';
  const isVideoNode = nodeType === 'geminiVideoNode';
  const isTextNode = nodeType === 'geminiTextNode';
  const isSpeechNode = nodeType === 'geminiSpeechNode';
  const isMusicNode = nodeType === 'geminiMusicNode';

  const update = (key, value) => updateNodeSettings(selectedId, { [key]: value });

  const handleRun = async () => {
    if (!selectedId || status === 'loading') return;
    for (let i = 0; i < runCount; i++) {
      await executeSingle(selectedId);
    }
  };

  const allModels = Object.values(MODELS).flat();
  const modelOptions = isImageNode ? MODELS.image
    : isVideoNode ? MODELS.video
    : isTextNode ? MODELS.text
    : isSpeechNode ? MODELS.audio
    : isMusicNode ? MODELS.music
    : [];

  return (
    <div className="right-panel">
      {/* Header */}
      <div className="rp-header">
        <span className="rp-title">Tasks</span>
        <ChevronDown size={14} />
      </div>

      {/* Model Badge */}
      <div className="rp-model-badge">
        <div className="rp-model-icon">
          <Zap size={13} />
        </div>
        <span className="rp-model-name" title={modelData?.label || selectedNode.data?.label}>
          {modelData?.name || selectedNode.data?.label || 'Node'}
        </span>
        <span className="rp-model-cost">× free</span>
      </div>

      <div className="rp-body">
        {/* Model Dropdown */}
        {modelOptions.length > 0 && (
          <div className="rp-field">
            <label className="rp-label">
              Model
            </label>
            <select
              className="rp-select"
              value={settings.model || modelData?.id || ''}
              onChange={(e) => update('model', e.target.value)}
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Seed (for image/video) */}
        {(isImageNode || isVideoNode) && (
          <div className="rp-field">
            <label className="rp-label">Seed</label>
            <div className="rp-row">
              <label className="rp-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.randomSeed !== false}
                  onChange={(e) => update('randomSeed', e.target.checked)}
                />
                <span>Random</span>
              </label>
              <input
                className="rp-input-seed"
                type="number"
                value={settings.seed || 0}
                disabled={settings.randomSeed !== false}
                onChange={(e) => update('seed', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Resolution (for image) */}
        {isImageNode && (
          <div className="rp-field">
            <label className="rp-label">Resolution</label>
            <select
              className="rp-select"
              value={settings.resolution || '1K'}
              onChange={(e) => update('resolution', e.target.value)}
            >
              {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* Aspect Ratio */}
        {(isImageNode || isVideoNode) && (
          <div className="rp-field">
            <label className="rp-label">Aspect Ratio</label>
            <select
              className="rp-select"
              value={settings.aspectRatio || '16:9'}
              onChange={(e) => update('aspectRatio', e.target.value)}
            >
              {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* Duration (for video/music) */}
        {(isVideoNode || isMusicNode) && (
          <div className="rp-field">
            <label className="rp-label">Duration (seconds)</label>
            <select
              className="rp-select"
              value={settings.duration || 8}
              onChange={(e) => update('duration', parseInt(e.target.value))}
            >
              {VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
            </select>
          </div>
        )}

        {/* Temperature (text) */}
        {isTextNode && (
          <div className="rp-field">
            <label className="rp-label">Temperature: {(settings.temperature || 1).toFixed(1)}</label>
            <input
              type="range" min="0" max="2" step="0.1"
              value={settings.temperature || 1}
              className="rp-slider"
              onChange={(e) => update('temperature', parseFloat(e.target.value))}
            />
          </div>
        )}

        {/* Max Tokens (text) */}
        {isTextNode && (
          <div className="rp-field">
            <label className="rp-label">Max Tokens</label>
            <select
              className="rp-select"
              value={settings.maxTokens || 8192}
              onChange={(e) => update('maxTokens', parseInt(e.target.value))}
            >
              {[1024, 4096, 8192, 16384, 32768, 65536].map((t) => (
                <option key={t} value={t}>{t.toLocaleString()}</option>
              ))}
            </select>
          </div>
        )}

        {/* Voice (speech) */}
        {isSpeechNode && (
          <div className="rp-field">
            <label className="rp-label">Voice</label>
            <select
              className="rp-select"
              value={settings.voice || 'Alloy'}
              onChange={(e) => update('voice', e.target.value)}
            >
              {['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* Number of images */}
        {isImageNode && (
          <div className="rp-field">
            <label className="rp-label">Images to generate</label>
            <select
              className="rp-select"
              value={settings.numberOfImages || 1}
              onChange={(e) => update('numberOfImages', parseInt(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {/* Web Search (text) */}
        {isTextNode && (
          <div className="rp-field">
            <label className="rp-checkbox-label">
              <input
                type="checkbox"
                checked={settings.enableWebSearch || false}
                onChange={(e) => update('enableWebSearch', e.target.checked)}
              />
              <span>Enable Web Search</span>
            </label>
          </div>
        )}

        {/* Negative Prompt (image) */}
        {isImageNode && (
          <div className="rp-field">
            <label className="rp-label">Negative Prompt (optional)</label>
            <textarea
              className="rp-textarea"
              rows={2}
              placeholder="What to avoid..."
              value={settings.negativePrompt || ''}
              onChange={(e) => update('negativePrompt', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Run Controls */}
      <div className="rp-run-section">
        <div className="rp-run-label">Run selected nodes</div>
        <div className="rp-runs-row">
          <span>Runs</span>
          <div className="rp-counter">
            <button onClick={() => setRunCount(Math.max(1, runCount - 1))}><Minus size={12} /></button>
            <span>{runCount}</span>
            <button onClick={() => setRunCount(runCount + 1)}><Plus size={12} /></button>
          </div>
        </div>
        <div className="rp-cost-row">
          <span>Total cost:</span>
          <span className="rp-cost-free">× 0 (free)</span>
        </div>
        <button
          className={`rp-run-btn ${status === 'loading' ? 'rp-run-btn--loading' : ''}`}
          onClick={handleRun}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <><span className="spinner" /> Running...</>
          ) : (
            <><Play size={14} /> Run selected</>
          )}
        </button>
      </div>
    </div>
  );
}
