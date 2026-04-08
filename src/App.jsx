import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightPanel from './components/RightPanel';
import PreviewModal from './components/PreviewModal';
import './index.css';

import { useFlowStore } from './store/useFlowStore';

export default function App() {
  const mobileSidebarOpen = useFlowStore(s => s.mobileSidebarOpen);
  const mobilePanelOpen = useFlowStore(s => s.mobilePanelOpen);
  const setMobileSidebarOpen = useFlowStore(s => s.setMobileSidebarOpen);
  const setMobilePanelOpen = useFlowStore(s => s.setMobilePanelOpen);

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
