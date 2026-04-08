import React from 'react';
import {
  Search, Clock, Layers, ImageIcon, Plus, Settings, Cpu, Music, Film, Clapperboard,
} from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import StoryboardPanel from './StoryboardPanel';

const NAV_ITEMS = [
  { id: 'search',  icon: Search,    label: 'Search', panel: 'search' },
  { id: 'history', icon: Clock,     label: 'History', panel: 'history' },
  { id: 'layers',  icon: Layers,    label: 'Layers', panel: 'layers' },
  { id: 'assets',  icon: ImageIcon, label: 'Assets', panel: 'assets' },
  { id: 'add',     icon: Plus,      label: 'Add Node', panel: 'add' },
  { id: 'models',  icon: Cpu,       label: 'Models', panel: 'models' },
  { id: 'music',   icon: Music,     label: 'Music', panel: 'music' },
  { id: 'video',   icon: Film,      label: 'Video', panel: 'video' },
  { id: 'settings',icon: Settings,  label: 'Settings', panel: 'settings' },
];

export default function LeftSidebar() {
  const [activePanel, setActivePanel] = React.useState(null);
  const { nodes, storyboardOpen, toggleStoryboard } = useFlowStore();

  const toggle = (panel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  // Listen for the Output node's "Continue in Director" button
  React.useEffect(() => {
    const handler = () => {
      // Open the storyboard slide-over
      if (!storyboardOpen) toggleStoryboard?.();
    };
    window.addEventListener('director:open', handler);
    return () => window.removeEventListener('director:open', handler);
  }, [storyboardOpen, toggleStoryboard]);

  return (
    <>
      <div className="left-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="logo-mark">G</span>
        </div>

        <div className="sidebar-divider" />

        {/* Director AI button — top of nav, highlighted */}
        <div className="sidebar-nav">
          <button
            className={`sidebar-btn sidebar-btn--director ${storyboardOpen ? 'sidebar-btn--active' : ''}`}
            onClick={toggleStoryboard}
            title="Director AI — Cinematic Storyboard Chat"
          >
            <Clapperboard size={18} />
          </button>

          <div className="sidebar-divider" style={{ margin: '4px 0' }} />

          {NAV_ITEMS.map(({ id, icon: Icon, label, panel }) => (
            <button
              key={id}
              className={`sidebar-btn ${activePanel === panel ? 'sidebar-btn--active' : ''}`}
              onClick={() => toggle(panel)}
              title={label}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Slide-out panel */}
        {activePanel === 'layers' && (
          <div className="sidebar-flyout">
            <div className="flyout-header">Layers</div>
            <div className="flyout-body">
              {nodes.length === 0 ? (
                <p className="flyout-empty">No nodes yet. Right-click canvas to add.</p>
              ) : (
                nodes.map((n) => (
                  <div key={n.id} className="flyout-layer-item">
                    <span className="layer-dot" />
                    <span>{n.data?.label || n.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activePanel === 'settings' && (
          <div className="sidebar-flyout">
            <div className="flyout-header">Settings</div>
            <div className="flyout-body">
              <div className="rp-field">
                <label className="rp-label">API Key (stored locally)</label>
                <input
                  type="password"
                  className="rp-input-seed"
                  placeholder="GEMINI_API_KEY"
                  style={{ width: '100%' }}
                  onBlur={(e) => localStorage.setItem('GEMINI_API_KEY', e.target.value)}
                  defaultValue={localStorage.getItem('GEMINI_API_KEY') || ''}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Director AI Panel — slides out to the right of the sidebar */}
      <StoryboardPanel />
    </>
  );
}
