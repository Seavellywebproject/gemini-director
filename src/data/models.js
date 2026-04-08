// All Google AI Studio models — verified live against API 2026-04-08
export const MODEL_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  TEXT: 'text',
  AUDIO: 'audio',
  MUSIC: 'music',
  UTILITY: 'utility',
};

export const MODELS = {
  // ── IMAGE GENERATION ──────────────────────────────────────────────
  image: [
    {
      id: 'imagen-3.0-generate-002',
      name: '⭐ Imagen 3',
      label: 'Imagen 3',
      description: 'Studio-quality photorealism — highest fidelity text-to-image',
      category: MODEL_CATEGORIES.IMAGE,
      subcategory: 'generate_from_text',
      params: { resolution: ['1K', '2K', '4K'], aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9'] },
    },
    {
      id: 'imagen-3.0-fast-generate-001',
      name: '⚡ Imagen 3 Fast',
      label: 'Imagen 3 Fast',
      description: 'Fastest Imagen generation for iteration and storyboards',
      category: MODEL_CATEGORIES.IMAGE,
      subcategory: 'generate_from_text',
      params: { resolution: ['1K'], aspectRatios: ['1:1', '4:3', '16:9', '9:16'] },
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      label: 'Gemini 2.5 Flash',
      description: 'Native Gemini image gen + excellent face reference support',
      category: MODEL_CATEGORIES.IMAGE,
      subcategory: 'generate_from_text',
      params: { resolution: ['512px', '1K', '2K'], aspectRatios: ['1:1', '4:3', '16:9', '9:16'] },
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      label: 'Gemini 2.5 Pro',
      description: 'Pro multimodal image gen — precise text rendering and layouts',
      category: MODEL_CATEGORIES.IMAGE,
      subcategory: 'generate_from_text',
      params: { resolution: ['1K', '2K', '4K'], aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'] },
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Edit Image',
      label: 'Edit Image — Gemini',
      description: 'Inpaint, edit, and enhance existing images natively',
      category: MODEL_CATEGORIES.IMAGE,
      subcategory: 'edit_images',
      params: { resolution: ['512px', '1K'], aspectRatios: ['1:1', '4:3', '16:9'] },
    },
    {
      id: 'imagen-3.0-generate-002',
      name: 'Enhance — Imagen 3',
      label: 'Enhance — Imagen 3',
      description: 'Enhance and upscale images accurately',
      category: MODEL_CATEGORIES.IMAGE,
      subcategory: 'enhance_images',
      params: { resolution: ['2K', '4K'], aspectRatios: ['1:1', '4:3', '16:9'] },
    },
  ],

  // ── VIDEO GENERATION ─────────────────────────────────────────────
  video: [
    {
      id: 'veo-2.0-generate-001',
      name: 'Veo 2.0',
      label: 'Veo 2.0',
      description: 'Cinematic video generation with high realism',
      category: MODEL_CATEGORIES.VIDEO,
      subcategory: 'text_to_video',
      params: { durations: [4, 5, 8], aspectRatios: ['16:9', '9:16', '1:1'], resolutions: ['720p', '1080p'] },
    },
    {
      id: 'veo-2.0-fast-generate-001',
      name: 'Veo 2.0 Fast',
      label: 'Veo 2.0 Fast',
      description: 'Faster Veo 2.0 generation for prototyping',
      category: MODEL_CATEGORIES.VIDEO,
      subcategory: 'text_to_video',
      params: { durations: [4, 5, 8], aspectRatios: ['16:9'], resolutions: ['720p'] },
    },

  ],

  // ── TEXT / REASONING ────────────────────────────────────────────
  text: [
    {
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro',
      label: 'Gemini 3.1 Pro',
      description: 'Most advanced — complex reasoning, agentic tasks, coding',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 65536, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-3-pro-preview',
      name: 'Gemini 3 Pro',
      label: 'Gemini 3 Pro',
      description: 'Frontier-class reasoning with multimodal capability',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 65536, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-3-flash-preview',
      name: 'Gemini 3 Flash',
      label: 'Gemini 3 Flash',
      description: 'Frontier-class performance at a fraction of the cost',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 32768, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-3.1-flash-lite-preview',
      name: 'Gemini 3.1 Flash Lite',
      label: 'Gemini 3.1 Flash Lite',
      description: 'Fastest and cheapest in the 3.x family',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 8192, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      label: 'Gemini 2.5 Pro',
      description: 'Deep reasoning and coding — best stable model',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 65536, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      label: 'Gemini 2.5 Flash',
      description: 'Best price/performance — low latency, high volume',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 32768, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      label: 'Gemini 2.5 Flash Lite',
      description: 'Fastest and most budget-friendly multimodal',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 8192, temperature: [0, 1, 2] },
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      label: 'Gemini 2.0 Flash',
      description: 'Reliable baseline — fast, stable multimodal',
      category: MODEL_CATEGORIES.TEXT,
      params: { maxTokens: 8192, temperature: [0, 1, 2] },
    },
  ],

  // ── AUDIO / SPEECH ──────────────────────────────────────────────
  audio: [
    {
      id: 'gemini-2.5-flash-preview-tts',
      name: 'Flash TTS 2.5',
      label: 'Gemini 2.5 Flash TTS',
      description: 'Fast, controllable text-to-speech for real-time apps',
      category: MODEL_CATEGORIES.AUDIO,
      params: { voices: ['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'] },
    },
    {
      id: 'gemini-2.5-pro-preview-tts',
      name: 'Pro TTS 2.5',
      label: 'Gemini 2.5 Pro TTS',
      description: 'High-fidelity speech for podcasts and audiobooks',
      category: MODEL_CATEGORIES.AUDIO,
      params: { voices: ['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'] },
    },
    {
      id: 'gemini-3.1-flash-live-preview',
      name: 'Flash Live 3.1',
      label: 'Gemini 3.1 Flash Live',
      description: 'Real-time voice dialogue — audio-to-audio',
      category: MODEL_CATEGORIES.AUDIO,
      params: {},
    },
    {
      id: 'gemini-2.5-flash-native-audio-latest',
      name: 'Flash Native Audio',
      label: 'Gemini 2.5 Flash Native Audio',
      description: 'Bidirectional voice + video agents, sub-second latency',
      category: MODEL_CATEGORIES.AUDIO,
      params: {},
    },
  ],

  // ── MUSIC ────────────────────────────────────────────────────────
  music: [
    {
      id: 'lyria-3-pro-preview',
      name: 'Lyria 3 Pro',
      label: 'Lyria 3 Pro',
      description: 'Full-length songs with complex structural coherence',
      category: MODEL_CATEGORIES.MUSIC,
      params: { durations: [30, 60, 120, 180] },
    },
    {
      id: 'lyria-3-clip-preview',
      name: 'Lyria 3 Clip',
      label: 'Lyria 3 Clip',
      description: 'Short clips, loops, and previews up to 30 seconds',
      category: MODEL_CATEGORIES.MUSIC,
      params: { durations: [5, 10, 15, 30] },
    },
  ],

  // ── UTILITY / SPECIALIST ─────────────────────────────────────────
  utility: [
    {
      id: 'gemini-embedding-2-preview',
      name: 'Embedding 2',
      label: 'Gemini Embedding 2',
      description: 'Multimodal embeddings — text, images, video, audio, PDFs',
      category: MODEL_CATEGORIES.UTILITY,
      params: {},
    },
    {
      id: 'gemini-embedding-001',
      name: 'Embedding',
      label: 'Gemini Embedding',
      description: 'Text semantic search, classification, RAG',
      category: MODEL_CATEGORIES.UTILITY,
      params: {},
    },
    {
      id: 'gemini-2.5-computer-use-preview-10-2025',
      name: 'Computer Use',
      label: 'Computer Use',
      description: 'AI that sees a screen and can click/type to automate tasks',
      category: MODEL_CATEGORIES.UTILITY,
      params: {},
    },
    {
      id: 'deep-research-pro-preview-12-2025',
      name: 'Deep Research',
      label: 'Gemini Deep Research',
      description: 'Autonomous research across hundreds of sources, cited reports',
      category: MODEL_CATEGORIES.UTILITY,
      params: {},
    },
  ],
};

// Context menu structure
export const CONTEXT_MENU_ITEMS = [
  { type: 'action', id: 'prompt', label: 'Prompt', nodeType: 'promptNode' },
  { type: 'action', id: 'import', label: 'Import', nodeType: 'imageInputNode' },
  { type: 'action', id: 'export', label: 'Export' },
  { type: 'action', id: 'preview', label: 'Preview' },
  { type: 'separator' },
  { type: 'action', id: 'import_model', label: 'Import Model' },
  { type: 'action', id: 'import_lora', label: 'Import LoRA' },
  { type: 'action', id: 'import_loras', label: 'Import Multiple LoRAs' },
  { type: 'separator' },
  {
    type: 'submenu', id: 'tools', label: 'Tools',
    children: [
      { type: 'action', id: 'output_node', label: 'Output Node', nodeType: 'outputNode' },
      { type: 'action', id: 'text_output', label: 'Text Output', nodeType: 'textOutputNode' },
      { type: 'action', id: 'rewrite_node', label: '✍️ Rewrite', nodeType: 'rewriteNode' },
      { type: 'action', id: 'lipsync_node', label: '👄 LipSync', nodeType: 'lipSyncNode' },
    ],
  },
  {
    type: 'submenu', id: 'image_models', label: 'Image models',
    children: [
      {
        type: 'submenu', id: 'generate_from_text', label: 'Generate from text',
        children: MODELS.image
          .filter(m => m.subcategory === 'generate_from_text')
          .map(m => ({ type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiImageNode' })),
      },
      {
        type: 'submenu', id: 'edit_images', label: 'Edit images',
        children: MODELS.image
          .filter(m => m.subcategory === 'edit_images')
          .map(m => ({ type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiImageNode' })),
      },
      {
        type: 'submenu', id: 'enhance_images', label: 'Enhance images',
        children: MODELS.image
          .filter(m => m.subcategory === 'enhance_images')
          .map(m => ({ type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiImageNode' })),
      },
    ],
  },
  {
    type: 'submenu', id: 'video_models', label: 'Video models',
    children: MODELS.video.map(m => ({
      type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiVideoNode',
    })),
  },
  {
    type: 'submenu', id: 'audio_models', label: 'Audio models',
    children: MODELS.audio.map(m => ({
      type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiSpeechNode',
    })),
  },
  {
    type: 'submenu', id: 'music_models', label: 'Music models',
    children: MODELS.music.map(m => ({
      type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiMusicNode',
    })),
  },
  {
    type: 'submenu', id: 'text_models', label: 'Text models',
    children: MODELS.text.map(m => ({
      type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiTextNode',
    })),
  },
  {
    type: 'submenu', id: 'utility_models', label: 'Utility models',
    children: MODELS.utility.map(m => ({
      type: 'model', id: m.id, label: m.name, model: m, nodeType: 'geminiTextNode',
    })),
  },
];
