import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';

// ── Auto-save debounce timer (T10) ────────────────────────────
let _saveTimer = null;
function scheduleSave(state) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const { storyboard, characters, projectSettings } = state;
      localStorage.setItem(
        'gflow-director',
        JSON.stringify({ storyboard, characters, projectSettings })
      );
    } catch {}
  }, 2000);
}

const generateId = () => crypto.randomUUID();


const DEFAULT_SETTINGS = {
  model: null,
  seed: Math.floor(Math.random() * 999999),
  randomSeed: true,
  resolution: '1K',
  aspectRatio: '16:9',
  duration: 8,
  temperature: 1,
  maxTokens: 8192,
  enableWebSearch: false,
  numberOfImages: 1,
  voice: 'Alloy',
  runs: 1,
};

export const useFlowStore = create((set, get) => ({
  // ── UI State ──────────────────────────────────────
  mobileSidebarOpen: false,
  mobilePanelOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setMobilePanelOpen: (open) => set({ mobilePanelOpen: open }),

  // ── React Flow State ──────────────────────────────
  nodes: [],
  edges: [],

  // ── Node Metadata ──────────────────────────────────
  nodeOutputs: {},     // { [nodeId]: { image, video, text, audio } }
  nodeStatuses: {},    // { [nodeId]: 'idle' | 'loading' | 'success' | 'error' | 'queued' }
  nodeSettings: {},    // { [nodeId]: { ...DEFAULT_SETTINGS } }
  nodeErrors: {},      // { [nodeId]: string }

  // ── App State ──────────────────────────────────────
  selectedNodeIds: [],
  selectedEdgeIds: [],
  activeTool: 'select', // 'select' | 'hand'
  contextMenu: null,    // { x, y, flowX, flowY } | null
  previewMedia: null,   // { url, type } | null
  setPreviewMedia: (media) => set({ previewMedia: media }),
  clearPreviewMedia: () => set({ previewMedia: null }),

  // ── Director / Storyboard Panel ────────────────────
  storyboardOpen: false,
  toggleStoryboard: () => set((s) => ({ storyboardOpen: !s.storyboardOpen })),

  // Chat history: [{ id, role: 'user'|'assistant', content, type: 'text'|'storyboard', storyboard? }]
  chatHistory: [],
  addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  updateLastAssistantMessage: (patch) => set((s) => {
    const history = [...s.chatHistory];
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') { history[i] = { ...history[i], ...patch }; break; }
    }
    return { chatHistory: history };
  }),
  clearChat: () => set({ chatHistory: [], storyboard: null }),

  // ── Storage: auto-save + restore (T10) ────────────────────────
  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem('gflow-director');
      if (!raw) return;
      const { storyboard, characters, projectSettings } = JSON.parse(raw);

      // ── Migrate stale model IDs (old preview-dated names) ──────────
      const MODEL_MIGRATIONS = {
        'imagen-4.0-generate-preview-05-20': 'imagen-4.0-generate-001',
        'imagen-4.0-ultra-generate-preview-05-20': 'imagen-4.0-ultra-generate-001',
        'gemini-2.5-flash-preview-05-20': 'gemini-2.5-flash',
        'gemini-2.5-pro-preview-05-06': 'gemini-2.5-pro',
        'gemini-2.5-flash-preview-image-generation': 'gemini-2.5-flash-image',
        'gemini-2.5-flash-live-preview': 'gemini-2.5-flash-native-audio-latest',
        'veo-3.0-generate-preview': 'veo-3.0-generate-001',
        'deep-research-pro-preview': 'deep-research-pro-preview-12-2025',
        'gemini-2.5-computer-use-preview': 'gemini-2.5-computer-use-preview-10-2025',
      };
      if (projectSettings?.imageModel && MODEL_MIGRATIONS[projectSettings.imageModel]) {
        projectSettings.imageModel = MODEL_MIGRATIONS[projectSettings.imageModel];
      }

      set((s) => ({
        storyboard: storyboard || null,
        characters: characters || [],
        projectSettings: { ...s.projectSettings, ...projectSettings },
      }));
    } catch {}
  },

  exportProject: () => {
    const { storyboard, characters, projectSettings } = get();
    const json = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), storyboard, characters, projectSettings },
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectSettings?.title?.replace(/[^a-z0-9]/gi, '_') || 'untitled'}.gflow`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  importProject: (jsonStr) => {
    try {
      const { storyboard, characters, projectSettings } = JSON.parse(jsonStr);
      set((s) => ({
        storyboard: storyboard || null,
        characters: characters || [],
        projectSettings: { ...s.projectSettings, ...projectSettings },
        chatHistory: [],
      }));
      get().saveToStorage();
    } catch (e) {
      console.error('[importProject] Failed to parse .gflow file:', e);
    }
  },

  saveToStorage: () => {
    scheduleSave(get());
  },

  // Current storyboard
  storyboard: null,
  setStoryboard: (data) => {
    set({ storyboard: data });
    scheduleSave(get());
  },
  updateScene: (sceneId, patch) => set((s) => {
    if (!s.storyboard) return {};
    const acts = s.storyboard.acts.map(act => ({
      ...act,
      scenes: act.scenes.map(sc => sc.id === sceneId ? { ...sc, ...patch } : sc),
    }));
    const next = { storyboard: { ...s.storyboard, acts } };
    scheduleSave({ ...s, ...next });
    return next;
  }),
  deleteScene: (sceneId) => set((s) => {
    if (!s.storyboard) return {};
    const acts = s.storyboard.acts.map(act => ({
      ...act,
      scenes: act.scenes.filter(sc => sc.id !== sceneId),
    }));
    const next = { storyboard: { ...s.storyboard, acts } };
    scheduleSave({ ...s, ...next });
    return next;
  }),
  duplicateScene: (sceneId) => set((s) => {
    if (!s.storyboard) return {};
    const acts = s.storyboard.acts.map(act => {
      const idx = act.scenes.findIndex(sc => sc.id === sceneId);
      if (idx === -1) return act;
      const copy = { ...act.scenes[idx], id: `sc-${Date.now()}`, order: act.scenes[idx].order + 0.5 };
      const scenes = [...act.scenes.slice(0, idx + 1), copy, ...act.scenes.slice(idx + 1)];
      return { ...act, scenes };
    });
    const next = { storyboard: { ...s.storyboard, acts } };
    scheduleSave({ ...s, ...next });
    return next;
  }),

  // Character registry
  characters: [],
  addCharacter: (char) => {
    set((s) => ({ characters: [...s.characters, char] }));
    scheduleSave(get());
  },
  updateCharacter: (id, patch) => {
    set((s) => ({ characters: s.characters.map(c => c.id === id ? { ...c, ...patch } : c) }));
    scheduleSave(get());
  },
  removeCharacter: (id) => {
    set((s) => ({ characters: s.characters.filter(c => c.id !== id) }));
    scheduleSave(get());
  },

  // Project settings (T11)
  projectSettings: {
    title: 'Untitled Project',
    director: '',
    genre: '',
    aspectRatio: '16:9',
    frameRate: '24',
    styleReference: '',
    imageModel: 'imagen-4.0-generate-001', // Nano Banana Pro
  },
  updateProjectSettings: (patch) => {
    set((s) => ({ projectSettings: { ...s.projectSettings, ...patch } }));
    scheduleSave(get());
  },

  // ── History (Undo/Redo) ───────────────────────────
  history: [],
  historyIndex: -1,

  // ── React Flow Handlers ───────────────────────────
  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          id: generateId(),
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        },
        state.edges
      ),
    }));
  },

  // ── Add Node ───────────────────────────────────────
  addNode: (nodeType, position, model = null) => {
    const id = generateId();
    const settings = {
      ...DEFAULT_SETTINGS,
      model: model?.id || null,
      seed: Math.floor(Math.random() * 999999),
    };

    const nodeDefaults = {
      promptNode:     { label: 'Prompt', data: { text: '' } },
      imageInputNode: { label: 'Image Input', data: { image: null } },
      geminiImageNode:{ label: model?.name || 'Gemini Image', data: { model } },
      geminiVideoNode:{ label: model?.name || 'Gemini Video', data: { model } },
      geminiTextNode: { label: model?.name || 'Gemini Text', data: { model } },
      geminiSpeechNode:{ label: model?.name || 'Gemini Speech', data: { model } },
      geminiMusicNode:{ label: model?.name || 'Lyria Music', data: { model } },
      outputNode:     { label: 'Output', data: {} },
      textOutputNode: { label: 'Text Output', data: {} },
      rewriteNode:    { label: 'Rewrite', data: { rewriteMode: 'cinematic' } },
      lipSyncNode:    { label: 'LipSync', data: { dialogue: '' } },
    };

    const def = nodeDefaults[nodeType] || { label: nodeType, data: {} };

    const newNode = {
      id,
      type: nodeType,
      position,
      data: { ...def.data, label: def.label, nodeId: id },
    };

    set((state) => {
      const newNodes = [...state.nodes, newNode];
      const newSettings = { ...state.nodeSettings, [id]: settings };
      const newStatuses = { ...state.nodeStatuses, [id]: 'idle' };
      return { nodes: newNodes, nodeSettings: newSettings, nodeStatuses: newStatuses };
    });

    get().pushHistory();
    return id;
  },

  // ── Send Scene to Canvas (builds full cast pipeline) ─────────
  sendSceneToCanvas: async (scene, sceneImage, castPortraits, promptText, originX = 200, originY = 200) => {
    const newNodes = [];
    const newEdges = [];
    const newSettings = {};
    const newStatuses = {};
    const newOutputs = {};

    let _idCounter = Date.now();
    const makeId = () => `n-${_idCounter++}-${Math.random().toString(36).slice(2, 6)}`;
    const edgeStyle = { type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } };
    const edge = (source, sourceHandle, target, targetHandle) =>
      ({ id: makeId(), source, sourceHandle, target, targetHandle, ...edgeStyle });
    const nodeBase = (id, type, pos, data) =>
      ({ id, type, position: pos, data: { ...data, nodeId: id } });
    const settingsBase = { ...DEFAULT_SETTINGS, seed: Math.floor(Math.random() * 999999) };

    const ROW_GAP = 150;
    const COL_GAP = 260;

    // Left column: all reference images (portraits + scene image)
    const leftItems = [
      ...castPortraits.map(p => ({ label: p.name, image: p.image, isPortrait: true })),
      ...(sceneImage ? [{ label: `Scene ${scene.order || scene.id} (ref)`, image: sceneImage, isPortrait: false }] : []),
    ];

    const totalRows = Math.max(leftItems.length, 1);
    const generatorY = originY + ((totalRows - 1) * ROW_GAP) / 2;

    const generatorId = makeId();
    const generatorX = originX + (leftItems.length > 0 ? COL_GAP : 0);

    // 1. Left column — reference image nodes (portraits + scene image)
    leftItems.forEach((item, i) => {
      const id = makeId();
      const pos = { x: originX, y: originY + i * ROW_GAP };
      newNodes.push(nodeBase(id, 'imageInputNode', pos, {
        label: item.label,
        image: item.image,
        filename: item.label,
      }));
      newSettings[id] = { ...settingsBase };
      newStatuses[id] = 'idle';
      newOutputs[id] = { image: item.image };   // ← makes the handle output the image immediately
      // Wire every reference image → generator
      newEdges.push(edge(id, 'image', generatorId, 'image'));
    });

    // 2. Prompt node — sits above the generator
    const promptId = makeId();
    newNodes.push(nodeBase(promptId, 'promptNode', { x: generatorX, y: generatorY - 120 }, {
      label: 'Scene Prompt',
      text: promptText || scene.description || '',
    }));
    newSettings[promptId] = { ...settingsBase };
    newStatuses[promptId] = 'idle';
    newEdges.push(edge(promptId, 'prompt', generatorId, 'prompt'));

    // 3. Generator node
    newNodes.push(nodeBase(generatorId, 'geminiImageNode', { x: generatorX, y: generatorY }, {
      label: `Scene ${scene.order || scene.id} — ${scene.location || 'Generate'}`,
      model: null,
    }));
    newSettings[generatorId] = { ...settingsBase, model: 'gemini-2.5-flash-image' };
    newStatuses[generatorId] = 'idle';

    // 4. Scene image preview node (far right) — shows the EXISTING generated image immediately
    const previewId = makeId();
    const previewX = generatorX + COL_GAP;
    if (sceneImage) {
      newNodes.push(nodeBase(previewId, 'imageInputNode', { x: previewX, y: generatorY - 60 }, {
        label: `✅ Current: Scene ${scene.order || scene.id}`,
        image: sceneImage,
        filename: `scene-${scene.id}-current.jpg`,
        readonly: true,
      }));
      newSettings[previewId] = { ...settingsBase };
      newStatuses[previewId] = 'idle';
      newOutputs[previewId] = { image: sceneImage };
    }

    // 5. Output node (wired to generator output)
    const outputId = makeId();
    newNodes.push(nodeBase(outputId, 'outputNode', { x: previewX, y: generatorY + 80 }, { label: 'New Output' }));
    newSettings[outputId] = { ...settingsBase };
    newStatuses[outputId] = 'idle';
    newEdges.push(edge(generatorId, 'image', outputId, 'image'));

    set((state) => ({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
      nodeSettings: { ...state.nodeSettings, ...newSettings },
      nodeStatuses: { ...state.nodeStatuses, ...newStatuses },
      nodeOutputs:  { ...state.nodeOutputs,  ...newOutputs },
    }));

    get().pushHistory();
    return generatorId;
  },

  // ── Update Node Data ───────────────────────────────
  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  // ── Node Output ────────────────────────────────────
  setNodeOutput: (nodeId, output) => {
    set((state) => ({
      nodeOutputs: { ...state.nodeOutputs, [nodeId]: output },
    }));
  },

  getNodeOutput: (nodeId) => get().nodeOutputs[nodeId],

  // Returns all canvas nodes that have a generated image output (for Director image picker)
  getCanvasImages: () => {
    const { nodes, nodeOutputs } = get();
    return nodes
      .filter(n => nodeOutputs[n.id]?.image)
      .map(n => ({
        nodeId: n.id,
        label: n.data?.label || n.type || n.id,
        image: nodeOutputs[n.id].image,
      }));
  },


  // ── Node Status ────────────────────────────────────
  setNodeStatus: (nodeId, status, error = null) => {
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
      nodeErrors: error
        ? { ...state.nodeErrors, [nodeId]: error }
        : state.nodeErrors,
    }));
  },

  // ── Node Settings ──────────────────────────────────
  getNodeSettings: (nodeId) => {
    return get().nodeSettings[nodeId] || DEFAULT_SETTINGS;
  },

  updateNodeSettings: (nodeId, updates) => {
    set((state) => ({
      nodeSettings: {
        ...state.nodeSettings,
        [nodeId]: { ...(state.nodeSettings[nodeId] || DEFAULT_SETTINGS), ...updates },
      },
    }));
  },

  // ── Selection ──────────────────────────────────────
  setSelectedItems: (nodeIds, edgeIds) => set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds }),

  // ── Tool ───────────────────────────────────────────
  setActiveTool: (tool) => set({ activeTool: tool }),

  // ── Context Menu ───────────────────────────────────
  openContextMenu: (x, y, flowX, flowY) =>
    set({ contextMenu: { x, y, flowX, flowY } }),

  closeContextMenu: () => set({ contextMenu: null }),

  // ── History ────────────────────────────────────────
  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    // Keep last 50 snapshots
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const snapshot = history[historyIndex - 1];
    set({ nodes: snapshot.nodes, edges: snapshot.edges, historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const snapshot = history[historyIndex + 1];
    set({ nodes: snapshot.nodes, edges: snapshot.edges, historyIndex: historyIndex + 1 });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ── Delete Selected ────────────────────────────────
  deleteSelected: () => {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (!selectedNodeIds.length && !selectedEdgeIds.length) return;
    set((state) => ({
      nodes: state.nodes.filter((n) => !selectedNodeIds.includes(n.id)),
      edges: state.edges.filter(
        (e) => !selectedEdgeIds.includes(e.id) && !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
      ),
      selectedNodeIds: [],
      selectedEdgeIds: [],
    }));
    get().pushHistory();
  },

  // ── Save / Load ────────────────────────────────────
  exportPipeline: () => {
    const { nodes, edges, nodeSettings } = get();
    return JSON.stringify({ nodes, edges, nodeSettings }, null, 2);
  },

  importPipeline: (json) => {
    try {
      const { nodes, edges, nodeSettings } = JSON.parse(json);
      set({
        nodes: nodes || [],
        edges: edges || [],
        nodeSettings: nodeSettings || {},
        nodeOutputs: {},
        nodeStatuses: {},
        nodeErrors: {},
        selectedNodeIds: [],
      });
      get().pushHistory();
    } catch (e) {
      console.error('Failed to import pipeline:', e);
    }
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], nodeOutputs: {}, nodeStatuses: {}, nodeErrors: {}, selectedNodeIds: [], selectedEdgeIds: [] });
    get().pushHistory();
  },
}));
