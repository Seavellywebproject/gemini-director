import React, { useState, useEffect } from 'react';
import { Share2, Star, Play, Loader2, CheckCircle2, Menu, MessageSquare } from 'lucide-react';
import { useExecutePipeline } from '../hooks/useExecutePipeline';
import { useFlowStore } from '../store/useFlowStore';

export default function TopBar() {
  const [title, setTitle] = useState('untitled');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const { execute } = useExecutePipeline();
  const { mobileSidebarOpen, setMobileSidebarOpen, mobilePanelOpen, setMobilePanelOpen } = useFlowStore();

  // Listen for single-node run events from right panel
  useEffect(() => {
    const handler = async (e) => {
      const { nodeId } = e.detail;
      const { executeSingle } = useExecutePipeline();
      // executeSingle is stable inside the hook
    };
    window.addEventListener('run-node', handler);
    return () => window.removeEventListener('run-node', handler);
  }, []);

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

  return (
    <div className="top-bar">
      {/* Left: Logo + Title */}
      <div className="top-bar-left">
        <button 
          className="mobile-toggle-btn" 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          <Menu size={18} />
        </button>
        <div className="top-logo">
          <div className="top-logo-mark">G</div>
          <span className="top-logo-text">Flow</span>
        </div>
        <div className="top-divider" />
        <input
          className="top-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={(e) => e.target.select()}
          spellCheck={false}
        />
      </div>

      {/* Centre: Run Pipeline */}
      <button
        className={`run-pipeline-btn ${running ? 'run-pipeline-btn--loading' : ''} ${done ? 'run-pipeline-btn--done' : ''}`}
        onClick={handleRunAll}
        disabled={running}
        title="Run entire pipeline (Ctrl+Enter)"
      >
        {running ? (
          <><Loader2 size={14} className="spin" /> Running...</>
        ) : done ? (
          <><CheckCircle2 size={14} /> Done!</>
        ) : (
          <><Play size={14} /> Run Pipeline</>
        )}
      </button>

      {/* Right: Credits + Share */}
      <div className="top-bar-right">
        <div className="credits-badge">
          <Star size={12} />
          <span>Free · Gemini API</span>
        </div>
        <button className="share-btn hide-mobile">
          <Share2 size={13} />
          Share
        </button>
        <button 
          className="mobile-toggle-btn" 
          onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
        >
          <MessageSquare size={18} />
        </button>
      </div>
    </div>
  );
}
