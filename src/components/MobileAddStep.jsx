import React, { useState, useRef, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { CONTEXT_MENU_ITEMS } from '../data/models';
import { X, Search, Image, Film, Type, Mic, Music, Wrench } from 'lucide-react';

const CATEGORY_ICONS = {
  image_models: Image,
  video_models: Film,
  text_models: Type,
  audio_models: Mic,
  music_models: Music,
  tools: Wrench,
};

const QUICK_ITEMS = [
  { id: 'prompt', label: '📝 Prompt', nodeType: 'promptNode' },
  { id: 'import', label: '📂 Import Image', nodeType: 'imageInputNode' },
  { id: 'output', label: '📤 Output', nodeType: 'outputNode' },
  { id: 'rewrite', label: '✍️ Rewrite', nodeType: 'rewriteNode' },
];

export default function MobileAddStep({ open, onClose, insertIndex }) {
  const { addNode, nodes, edges } = useFlowStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory(null);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = (item) => {
    const y = (insertIndex ?? nodes.length) * 160 + 100;
    const nodeId = addNode(item.nodeType, { x: 200, y }, item.model || null);

    // Auto-connect to previous node if there are existing nodes
    if (nodes.length > 0 && insertIndex === undefined) {
      const prevNode = nodes[nodes.length - 1];
      const store = useFlowStore.getState();
      // Determine output handle
      const prevType = prevNode.type;
      let sourceHandle = 'prompt';
      if (prevType === 'imageInputNode' || prevType === 'geminiImageNode') sourceHandle = 'image';
      if (prevType === 'geminiVideoNode') sourceHandle = 'video';
      if (prevType === 'geminiTextNode' || prevType === 'rewriteNode') sourceHandle = 'text';
      if (prevType === 'geminiSpeechNode' || prevType === 'geminiMusicNode') sourceHandle = 'audio';
      if (prevType === 'promptNode') sourceHandle = 'prompt';

      let targetHandle = 'prompt';
      if (item.nodeType === 'geminiImageNode' || item.nodeType === 'geminiVideoNode') targetHandle = 'prompt';
      if (item.nodeType === 'outputNode' || item.nodeType === 'textOutputNode') targetHandle = 'image';

      store.onConnect({
        source: prevNode.id,
        sourceHandle,
        target: nodeId,
        targetHandle,
      });
    }

    onClose();
  };

  // Flatten submenus for search
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

  // Get category items
  const categories = CONTEXT_MENU_ITEMS.filter(i => i.type === 'submenu');
  const activeItems = activeCategory
    ? categories.find(c => c.id === activeCategory)?.children || []
    : null;

  // Flatten submenu children for display
  const flattenChildren = (items) => {
    const results = [];
    items.forEach(item => {
      if (item.type === 'submenu') {
        results.push({ type: 'header', label: item.label });
        (item.children || []).forEach(child => results.push(child));
      } else if (item.nodeType) {
        results.push(item);
      }
    });
    return results;
  };

  return (
    <div className="mobile-add-overlay">
      <div className="mobile-add-sheet">
        {/* Header */}
        <div className="mobile-add-header">
          <h3>Add Step</h3>
          <button className="mobile-add-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search — at the TOP */}
        <div className="mobile-add-search">
          <Search size={16} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
            placeholder="Search nodes..."
          />
        </div>

        {/* Content */}
        <div className="mobile-add-body">
          {searchResults ? (
            // Search results
            searchResults.length > 0 ? (
              searchResults.map((item) => (
                <button key={item.id} className="mobile-add-item" onClick={() => handleAdd(item)}>
                  <span className="mobile-add-item-dot" />
                  <span>{item.label}</span>
                </button>
              ))
            ) : (
              <div className="mobile-add-empty">No results for "{search}"</div>
            )
          ) : activeItems ? (
            // Category expanded
            <>
              <button className="mobile-add-back" onClick={() => setActiveCategory(null)}>
                ← Back to categories
              </button>
              {flattenChildren(activeItems).map((item, i) =>
                item.type === 'header' ? (
                  <div key={i} className="mobile-add-section-title">{item.label}</div>
                ) : (
                  <button key={item.id} className="mobile-add-item" onClick={() => handleAdd(item)}>
                    <span className="mobile-add-item-dot" />
                    <span>{item.label}</span>
                  </button>
                )
              )}
            </>
          ) : (
            // Default: quick items + categories
            <>
              <div className="mobile-add-section-title">Quick Add</div>
              {QUICK_ITEMS.map((item) => (
                <button key={item.id} className="mobile-add-item" onClick={() => handleAdd(item)}>
                  <span>{item.label}</span>
                </button>
              ))}

              <div className="mobile-add-section-title" style={{ marginTop: 16 }}>Categories</div>
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id] || Wrench;
                return (
                  <button key={cat.id} className="mobile-add-category" onClick={() => setActiveCategory(cat.id)}>
                    <Icon size={18} />
                    <span>{cat.label}</span>
                    <span className="mobile-add-chevron">›</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
