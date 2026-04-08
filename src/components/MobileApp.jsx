import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { useExecutePipeline } from '../hooks/useExecutePipeline';
import StoryboardPanel from './StoryboardPanel';
import MobilePipeline from './MobilePipeline';
import MobileAddStep from './MobileAddStep';
import PreviewModal from './PreviewModal';
import {
  Play, Loader2, CheckCircle2, Link2, MessageSquare,
  LayoutGrid, MoreHorizontal, Settings, Key, Download,
  Upload, Trash2,
} from 'lucide-react';
import { getApiKey, setApiKey, hasApiKey } from '../services/geminiClient';

export default function MobileApp() {
  const {
    mobileActiveTab, setMobileActiveTab,
    nodes, clearCanvas, exportProject, importProject,
    projectSettings, updateProjectSettings,
  } = useFlowStore();

  const { execute } = useExecutePipeline();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());

  const handleRunAll = async () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    try {
      await execute();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const handleSaveKey = () => {
    setApiKey(apiKeyInput);
  };

  const handleExport = () => {
    exportProject();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gflow,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      importProject(text);
    };
    input.click();
  };

  return (
    <div className="mobile-app">
      {/* ── Top Bar ── */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-left">
          <div className="mobile-topbar-logo">G</div>
          <span className="mobile-topbar-title">Director</span>
        </div>
        <button
          className={`mobile-topbar-run ${running ? 'mobile-topbar-run--loading' : ''} ${done ? 'mobile-topbar-run--done' : ''}`}
          onClick={handleRunAll}
          disabled={running || nodes.length === 0}
        >
          {running ? (
            <><Loader2 size={14} className="spin" /> Running</>
          ) : done ? (
            <><CheckCircle2 size={14} /> Done!</>
          ) : (
            <><Play size={14} /> Run All</>
          )}
        </button>
      </div>

      {/* ── Content Area ── */}
      <div className="mobile-content">
        {mobileActiveTab === 'pipeline' && (
          <MobilePipeline onAddStep={() => setAddStepOpen(true)} />
        )}

        {mobileActiveTab === 'chat' && (
          <div className="mobile-chat-wrapper">
            <StoryboardPanel mobileMode="chat" />
          </div>
        )}

        {mobileActiveTab === 'board' && (
          <div className="mobile-chat-wrapper">
            <StoryboardPanel mobileMode="board" />
          </div>
        )}

        {mobileActiveTab === 'more' && (
          <div className="mobile-more">
            <div className="mobile-more-section">
              <div className="mobile-more-title">
                <Key size={16} /> API Key
              </div>
              <div className="mobile-more-field">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Gemini API key..."
                />
                <button className="mobile-more-save" onClick={handleSaveKey}>
                  {hasApiKey() ? '✅ Saved' : 'Save'}
                </button>
              </div>
              <p className="mobile-more-hint">
                Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a>
              </p>
            </div>

            <div className="mobile-more-section">
              <div className="mobile-more-title">
                <Settings size={16} /> Project Settings
              </div>
              <div className="mobile-more-field">
                <label>Title</label>
                <input
                  value={projectSettings.title || ''}
                  onChange={(e) => updateProjectSettings({ title: e.target.value })}
                />
              </div>
              <div className="mobile-more-field">
                <label>Genre</label>
                <select
                  value={projectSettings.genre || ''}
                  onChange={(e) => updateProjectSettings({ genre: e.target.value })}
                >
                  <option value="">Select genre...</option>
                  {['Noir', 'Sci-Fi', 'Horror', 'Drama', 'Thriller', 'Western', 'Action', 'Comedy', 'Romance', 'Documentary'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="mobile-more-field">
                <label>Aspect Ratio</label>
                <select
                  value={projectSettings.aspectRatio || '16:9'}
                  onChange={(e) => updateProjectSettings({ aspectRatio: e.target.value })}
                >
                  {['16:9', '9:16', '4:3', '1:1', '21:9'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-more-section">
              <div className="mobile-more-title">
                <Download size={16} /> Import / Export
              </div>
              <div className="mobile-more-actions">
                <button onClick={handleExport}><Download size={14} /> Export Project</button>
                <button onClick={handleImport}><Upload size={14} /> Import Project</button>
              </div>
            </div>

            <div className="mobile-more-section">
              <div className="mobile-more-title">
                <Trash2 size={16} /> Danger Zone
              </div>
              <button className="mobile-more-danger" onClick={() => { if (confirm('Clear all nodes?')) clearCanvas(); }}>
                <Trash2 size={14} /> Clear Canvas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <div className="mobile-tabbar">
        <button
          className={`mobile-tab ${mobileActiveTab === 'pipeline' ? 'mobile-tab--active' : ''}`}
          onClick={() => setMobileActiveTab('pipeline')}
        >
          <Link2 size={20} />
          <span>Pipeline</span>
        </button>
        <button
          className={`mobile-tab ${mobileActiveTab === 'chat' ? 'mobile-tab--active' : ''}`}
          onClick={() => setMobileActiveTab('chat')}
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button
          className={`mobile-tab ${mobileActiveTab === 'board' ? 'mobile-tab--active' : ''}`}
          onClick={() => setMobileActiveTab('board')}
        >
          <LayoutGrid size={20} />
          <span>Board</span>
        </button>
        <button
          className={`mobile-tab ${mobileActiveTab === 'more' ? 'mobile-tab--active' : ''}`}
          onClick={() => setMobileActiveTab('more')}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </div>

      {/* ── Add Step Sheet ── */}
      <MobileAddStep open={addStepOpen} onClose={() => setAddStepOpen(false)} />

      {/* ── Preview Modal ── */}
      <PreviewModal />
    </div>
  );
}
