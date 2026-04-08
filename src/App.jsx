import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightPanel from './components/RightPanel';
import PreviewModal from './components/PreviewModal';
import MobileApp from './components/MobileApp';
import './index.css';
import './styles/mobile.css';

import { useFlowStore } from './store/useFlowStore';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function App() {
  const isMobile = useIsMobile();
  const mobileSidebarOpen = useFlowStore(s => s.mobileSidebarOpen);
  const mobilePanelOpen = useFlowStore(s => s.mobilePanelOpen);
  const setMobileSidebarOpen = useFlowStore(s => s.setMobileSidebarOpen);
  const setMobilePanelOpen = useFlowStore(s => s.setMobilePanelOpen);

  // ── Mobile: completely different layout ──
  if (isMobile) {
    return (
      <ReactFlowProvider>
        <MobileApp />
      </ReactFlowProvider>
    );
  }

  // ── Desktop: original layout ──
  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <TopBar />
        <div className={`app-body ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''} ${mobilePanelOpen ? 'mobile-panel-open' : ''}`}>
          <LeftSidebar />
          
          {/* Mobile Overlay backgrounds */}
          {(mobileSidebarOpen || mobilePanelOpen) && (
            <div 
              className="mobile-overlay" 
              onClick={() => {
                setMobileSidebarOpen(false);
                setMobilePanelOpen(false);
              }}
            />
          )}

          <Canvas />
          <RightPanel />
        </div>
        <PreviewModal />
      </div>
    </ReactFlowProvider>
  );
}
