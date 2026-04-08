import React, { useState, useRef, useEffect } from 'react';
import { CONTEXT_MENU_ITEMS } from '../data/models';
import { useFlowStore } from '../store/useFlowStore';
import { ChevronRight, Search } from 'lucide-react';

export default function ContextMenu({ x, y, flowX, flowY, onClose }) {
  const { addNode } = useFlowStore();
  const [search, setSearch] = useState('');
  const [activeSubmenu, setActiveSubmenu] = useState(null); // { itemId, level1?, level2? }
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleAction = (item) => {
    if (item.nodeType) {
      addNode(item.nodeType, { x: flowX - 100, y: flowY - 50 }, item.model || null);
    }
    onClose();
  };

  const flatSearch = (items, query) => {
    const results = [];
    const walk = (list) => {
      list.forEach((item) => {
        if (item.type === 'submenu') walk(item.children || []);
        else if (item.label?.toLowerCase().includes(query.toLowerCase()) && item.nodeType) {
          results.push(item);
        }
      });
    };
    walk(items);
    return results;
  };

  const searchResults = search ? flatSearch(CONTEXT_MENU_ITEMS, search) : null;

  // Compute safe position
  const menuStyle = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 400),
    left: Math.min(x, window.innerWidth - 260),
    zIndex: 9999,
  };

  const renderItem = (item, depth = 0) => {
    if (item.type === 'separator') {
      return <div key={Math.random()} className="context-separator" />;
    }

    if (item.type === 'submenu') {
      const isOpen = activeSubmenu?.id === item.id;
      return (
        <div
          key={item.id}
          className="context-item context-item--submenu"
          onMouseEnter={() => setActiveSubmenu({ id: item.id, children: item.children })}
          onMouseLeave={() => setActiveSubmenu(null)}
          onClick={(e) => { e.stopPropagation(); setActiveSubmenu(prev => prev?.id === item.id ? null : { id: item.id, children: item.children }); }}
        >
          <span>{item.label}</span>
          <ChevronRight size={12} />
          {isOpen && (
            <div className="context-submenu" onMouseEnter={() => setActiveSubmenu({ id: item.id, children: item.children })}>
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className="context-item"
        onClick={() => handleAction(item)}
      >
        {item.type === 'model' && <span className="context-model-dot" />}
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <div ref={menuRef} className="context-menu" style={menuStyle}>
      {/* Search bar */}
      <div className="context-search">
        <Search size={13} />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="context-search-input"
        />
      </div>

      <div className="context-body">
        {searchResults ? (
          searchResults.length > 0 ? (
            searchResults.map((item) => renderItem(item))
          ) : (
            <div className="context-empty">No results</div>
          )
        ) : (
          CONTEXT_MENU_ITEMS.map((item) => renderItem(item))
        )}
      </div>
    </div>
  );
}
