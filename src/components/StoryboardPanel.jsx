import React, { useState, useRef, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { storyboardChat, hasApiKey, setApiKey, getApiKey } from '../services/geminiClient';
import ChatMessage from './ChatMessage';
import StoryboardCard from './StoryboardCard';
import CharacterRegistry from './CharacterRegistry';
import StoryboardExport from './StoryboardExport';
import {
  X, Send, Clapperboard, Users, LayoutGrid, Settings, Sparkles,
  Trash2, FileDown, Loader2, Images
} from 'lucide-react';

const TABS = [
  { id: 'chat', label: 'Chat', icon: Sparkles },
  { id: 'storyboard', label: 'Board', icon: LayoutGrid },
  { id: 'characters', label: 'Cast', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MODELS = [
  { id: 'gemini-3.1-pro-preview',        label: '✦ Gemini 3.1 Pro (Best)' },
  { id: 'gemini-3-flash-preview',         label: '⚡ Gemini 3 Flash (Fast)' },
  { id: 'gemini-2.5-pro',                label: '✦ Gemini 2.5 Pro (Stable)' },
  { id: 'gemini-2.5-flash',              label: '⚡ Gemini 2.5 Flash (Stable)' },
];

const GENRES = ['Noir', 'Sci-Fi', 'Horror', 'Drama', 'Thriller', 'Western', 'Action', 'Comedy', 'Romance', 'Documentary'];
const ASPECT_RATIOS = ['2.39:1', '1.85:1', '16:9', '4:3', '1:1'];

export default function StoryboardPanel({ mobileMode }) {
  const {
    storyboardOpen, toggleStoryboard,
    chatHistory, addChatMessage, updateLastAssistantMessage, clearChat,
    storyboard, setStoryboard,
    characters,
    projectSettings, updateProjectSettings,
    loadFromStorage,
  } = useFlowStore();

  const [activeTab, setActiveTab] = useState('chat');
  const [input, setInput] = useState('');
  const [model, setModel] = useState(MODELS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [genAllProgress, setGenAllProgress] = useState({ done: 0, total: 0 });
  const messagesEndRef = useRef(null);

  // T10 — restore from localStorage on panel open
  useEffect(() => {
    if (storyboardOpen || mobileMode) loadFromStorage();
  }, [storyboardOpen, mobileMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingText]);

  // In mobile mode, force the tab and always render
  useEffect(() => {
    if (mobileMode === 'chat') setActiveTab('chat');
    if (mobileMode === 'board') setActiveTab('storyboard');
  }, [mobileMode]);

  if (!mobileMode && !storyboardOpen) return null;

  // Generate All Images sequentially with progress
  const handleGenerateAllImages = async () => {
    if (!storyboard || generatingAll) return;
    const allScenes = storyboard.acts?.flatMap(a => a.scenes || []) || [];
    const scenesWithoutImages = allScenes; // generate all
    setGeneratingAll(true);
    setGenAllProgress({ done: 0, total: scenesWithoutImages.length });

    for (let i = 0; i < scenesWithoutImages.length; i++) {
      const sc = scenesWithoutImages[i];
      try {
        // Trigger generation via a custom event the card listens to
        window.dispatchEvent(new CustomEvent('generate-scene-image', { detail: { sceneId: sc.id } }));
        // Wait a fixed interval to not flood — queue handles the rest
        await new Promise(r => setTimeout(r, 800));
      } catch {}
      setGenAllProgress({ done: i + 1, total: scenesWithoutImages.length });
    }
    setGeneratingAll(false);
  };

  // Build history for the API (only text messages, not UI metadata)
  const buildApiHistory = () => chatHistory
    .filter(m => m.content)
    .map(m => ({ role: m.role, content: m.content }));

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;

    setInput('');
    setIsLoading(true);
    setStreamingText('');

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: msg };
    addChatMessage(userMsg);

    // Add placeholder assistant message
    const assistantMsgId = Date.now() + 1;
    addChatMessage({ id: assistantMsgId, role: 'assistant', content: '', streaming: true });

    const isStoryboard = detectStoryboardIntent(msg);

    try {
      if (!hasApiKey()) {
        updateLastAssistantMessage({ content: 'Error: No API key set. Go to Settings tab and enter your Gemini API key.', streaming: false });
        return;
      }

      let accumulated = '';

      const result = await storyboardChat({
        message: msg,
        history: buildApiHistory(),
        characters,
        projectSettings,
        model,
        forceStoryboard: isStoryboard,
        onChunk: (chunk) => {
          accumulated += chunk;
          setStreamingText(accumulated);
          updateLastAssistantMessage({ content: accumulated, streaming: true });
        },
      });

      if (result.type === 'storyboard' && result.storyboard) {
        setStoryboard(result.storyboard);
        updateLastAssistantMessage({
          content: `✅ Storyboard generated: "${result.storyboard.title}" — ${result.storyboard.acts?.reduce((n, a) => n + (a.scenes?.length || 0), 0)} scenes. Switching to Board tab.`,
          streaming: false,
          type: 'storyboard',
        });
        setActiveTab('storyboard');
      } else if (result.type === 'chat') {
        setStreamingText('');
        const detected = tryParseStoryboard(result.fullText);
        if (detected) {
          setStoryboard(detected);
          const sceneCount = detected.acts?.reduce((n, a) => n + (a.scenes?.length || 0), 0) || 0;
          updateLastAssistantMessage({
            content: `✅ Storyboard generated: "${detected.title}" — ${sceneCount} scenes across ${detected.acts?.length || 1} act(s). Switching to Board tab.`,
            streaming: false,
            type: 'storyboard',
          });
          setActiveTab('storyboard');
        } else {
          updateLastAssistantMessage({ content: result.fullText, streaming: false });
        }
      }
    } catch (err) {
      updateLastAssistantMessage({ content: `Error: ${err.message}`, streaming: false });
    } finally {
      setIsLoading(false);
    }
  };

  // Try to extract a storyboard JSON from any AI response text
  const tryParseStoryboard = (text) => {
    if (!text.includes('"type"') && !text.includes('"acts"')) return null;
    // Try direct parse first
    try { const p = JSON.parse(text); if (p?.acts) return p; } catch {}
    // Try extracting JSON block from markdown code block
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try { const p = JSON.parse(fenceMatch[1].trim()); if (p?.acts) return p; } catch {}
    }
    // Try extracting raw JSON object
    const objMatch = text.match(/\{[\s\S]*"acts"[\s\S]*\}/);
    if (objMatch) {
      try { const p = JSON.parse(objMatch[0]); if (p?.acts) return p; } catch {}
    }
    return null;
  };

  const detectStoryboardIntent = (msg) => {
    const keywords = [
      // Explicit board requests
      'storyboard', 'create scenes', 'break down', 'breakdown',
      'generate scenes', 'scene list', 'scene breakdown', 'visualize',
      'screenplay', 'shot list', 'act 1', 'short film', 'music video',
      'build the board', 'make the board', 'create the board', 'generate the board',
      // New story / idea prompts — auto-generate board
      'i want a story', 'i want a film', 'i want a movie', 'i want a short',
      'make a story', 'make a film', 'make a movie', 'create a story',
      'create a film', 'write a story', 'write a film', 'write a movie',
      '10sec', '10 sec', '10 second', '30sec', '30 second', '60sec',
      'cinematic film', 'cinematic story', 'cinematic movie',
    ];
    return keywords.some(k => msg.toLowerCase().includes(k));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleExportShotList = () => {
    if (!storyboard) return;
    const rows = [['Scene', 'INT/EXT', 'Location', 'Time', 'Shot', 'Lens', 'Movement', 'Cast', 'VFX', 'Duration']];
    storyboard.acts?.forEach(act => {
      act.scenes?.forEach(sc => {
        rows.push([sc.id, sc.intExt, sc.location, sc.timeOfDay, sc.shotType, sc.lens + 'mm', sc.movement, (sc.cast || []).join(';'), sc.vfx ? 'Yes' : 'No', sc.duration + 's']);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectSettings.title || 'storyboard'}-shot-list.csv`;
    a.click();
  };

  // eslint-disable-next-line no-unused-vars
  const handleSendToCanvas = () => {
    alert('Send to Canvas: Coming — will create connected Prompt + Nano Banana Pro nodes for each scene.');
  };


  return (
    <div className={`director-panel ${mobileMode ? 'director-panel--mobile' : ''}`}>
      {/* Panel header — desktop only */}
      {!mobileMode && (
        <div className="director-panel-header">
          <div className="director-panel-title">
            <Clapperboard size={16} />
            <span>Director AI</span>
          </div>
          <div className="director-panel-controls">
            <select className="director-model-select" value={model} onChange={e => setModel(e.target.value)}>
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button className="director-close-btn" onClick={toggleStoryboard}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Mobile: model picker inline */}
      {mobileMode === 'chat' && (
        <div className="mobile-model-picker">
          <select value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
      )}

      {/* Tab bar — desktop only */}
      {!mobileMode && (
        <div className="director-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`director-tab ${activeTab === id ? 'director-tab--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ── CHAT TAB ─────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="director-chat">
          <div className="chat-messages">
            {chatHistory.length === 0 && (
              <div className="chat-welcome">
                <Clapperboard size={32} />
                <h3>Director AI</h3>
                <p>Your cinematic co-writer. Tell me your story idea, describe your film, or ask me to create a full storyboard.</p>
                <div className="chat-suggestions">
                  {[
                    'Write a 5-scene noir detective story storyboard',
                    'I have a sci-fi story about a lone astronaut...',
                    'Create a storyboard breakdown for my screenplay',
                    'What lens should I use for an intimate drama?',
                  ].map(s => (
                    <button key={s} className="chat-suggestion" onClick={() => { setInput(s); }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map(msg => (
              <ChatMessage key={msg.id} message={msg} isStreaming={msg.streaming} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-quick-actions">
            <button
              className="chat-quick-btn chat-quick-btn--new"
              onClick={() => { clearChat(); setStoryboard(null); setActiveTab('chat'); }}
              title="Start a completely new story — clears chat and board"
            >
              <Trash2 size={11} /> New Story
            </button>
            <button
              className="chat-quick-btn chat-quick-btn--generate"
              onClick={() => {
                const msg = input.trim() || 'Generate the storyboard from our conversation so far.';
                setInput(msg);
                setTimeout(sendMessage, 50);
              }}
              disabled={isLoading}
              title="Force-generate a storyboard from the current conversation"
            >
              <Clapperboard size={11} /> Generate Board
            </button>
          </div>

          <div className="chat-input-row">
            <textarea
              className="chat-input nodrag nopan"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your story idea... (it auto-generates the board)"
              rows={2}
              disabled={isLoading}
            />
            <button className="chat-send-btn" onClick={sendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* ── STORYBOARD TAB ───────────────────────────── */}
      {activeTab === 'storyboard' && (
        <div className="director-storyboard">
          {!storyboard ? (
            <div className="storyboard-empty">
              <LayoutGrid size={32} />
              <p>No storyboard yet.</p>
              <p>Go to Chat and ask me to create a storyboard for your story.</p>
            </div>
          ) : (
            <>
              <div className="storyboard-toolbar">
                <span className="storyboard-title">{storyboard.title}</span>
                <div className="storyboard-toolbar-actions">
                  <button
                    className={`sb-toolbar-btn ${generatingAll ? 'sb-toolbar-btn--loading' : 'sb-toolbar-btn--primary'}`}
                    onClick={handleGenerateAllImages}
                    disabled={generatingAll}
                    title="Generate images for all scenes"
                  >
                    {generatingAll
                      ? <><Loader2 size={13} className="spin" /> {genAllProgress.done}/{genAllProgress.total}</>
                      : <><Images size={13} /> Generate All</>}
                  </button>
                </div>
              </div>
              <div className="storyboard-board">
                {storyboard.acts?.map(act => (
                  <div key={act.actNumber} className="storyboard-act">
                    <div className="storyboard-act-header">
                      <span className="storyboard-act-title">{act.title || `Act ${act.actNumber}`}</span>
                      <span className="storyboard-act-count">{act.scenes?.length || 0} scenes</span>
                    </div>
                    <div className="storyboard-scenes">
                      {act.scenes?.map(scene => (
                        <StoryboardCard key={scene.id} scene={scene} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Export tools below board */}
              <StoryboardExport />
            </>
          )}
        </div>
      )}

      {/* ── CHARACTERS TAB ───────────────────────────── */}
      {activeTab === 'characters' && (
        <div className="director-characters">
          <CharacterRegistry />
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="director-settings">
          <div className="settings-section-title">Project Settings</div>
          {[
            ['Project Title', 'title', 'text', null],
            ['Director Name', 'director', 'text', null],
          ].map(([label, field, type]) => (
            <div className="settings-field" key={field}>
              <label>{label}</label>
              <input
                type={type}
                className="nodrag nopan"
                value={projectSettings[field] || ''}
                onChange={e => updateProjectSettings({ [field]: e.target.value })}
                placeholder={label}
              />
            </div>
          ))}
          <div className="settings-field">
            <label>Genre</label>
            <select value={projectSettings.genre || ''} onChange={e => updateProjectSettings({ genre: e.target.value })}>
              <option value="">— Select Genre —</option>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label>Aspect Ratio (Film Format)</label>
            <select value={projectSettings.aspectRatio || '16:9'} onChange={e => updateProjectSettings({ aspectRatio: e.target.value })}>
              {ASPECT_RATIOS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label>Frame Rate</label>
            <select value={projectSettings.frameRate || '24'} onChange={e => updateProjectSettings({ frameRate: e.target.value })}>
              {['24', '25', '30', '48', '60'].map(r => <option key={r}>{r}fps</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label>Visual Style Reference</label>
            <input
              className="nodrag nopan"
              value={projectSettings.styleReference || ''}
              onChange={e => updateProjectSettings({ styleReference: e.target.value })}
              placeholder='e.g. "Like Blade Runner 2049"'
            />
          </div>
          <div className="settings-field">
            <label>Image Model</label>
            <select value={projectSettings.imageModel || 'imagen-4.0-generate-001'} onChange={e => updateProjectSettings({ imageModel: e.target.value })}>
              <option value="imagen-4.0-generate-001">Imagen 4 — Recommended</option>
              <option value="imagen-4.0-ultra-generate-001">Imagen 4 Ultra — Best Quality</option>
              <option value="imagen-4.0-fast-generate-001">Imagen 4 Fast — Quickest</option>
              <option value="gemini-3.1-flash-image-preview">🍌 Nano Banana 2 — Fast Native</option>
              <option value="gemini-3-pro-image-preview">🍌 Nano Banana Pro — Best Native</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash — Stable Native</option>
            </select>
          </div>

          <div className="settings-section-title" style={{ marginTop: 16 }}>🔑 API Key</div>
          <div className="settings-field">
            <label>Gemini API Key</label>
            <input
              type="password"
              className="nodrag nopan"
              value={getApiKey()}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key here"
            />
            <span style={{ fontSize: 10, color: '#6b7280', marginTop: 4, display: 'block' }}>
              Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color: '#818cf8'}}>aistudio.google.com/apikey</a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

