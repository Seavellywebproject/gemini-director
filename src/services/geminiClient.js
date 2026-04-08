/**
 * geminiClient.js — Browser-side Gemini API service.
 * Replaces ALL server routes. Calls Google's API directly from the browser.
 * API key is stored in localStorage.
 */
import { GoogleGenAI } from '@google/genai';

// ── API Key Management ──────────────────────────────────────────────
const STORAGE_KEY = 'gemini-api-key';
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || ENV_KEY || '';
}

export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key);
  _client = null; // reset client so it picks up new key
}

export function hasApiKey() {
  return !!getApiKey();
}

let _client = null;
function getClient() {
  const key = getApiKey();
  if (!key) throw new Error('No API key set. Open Settings to add your Gemini API key.');
  if (!_client) _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

// ── Helpers ─────────────────────────────────────────────────────────
function stripDataUrl(dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

function base64ToPart(base64, mimeType = 'image/png') {
  return { inlineData: { data: stripDataUrl(base64), mimeType } };
}

// ── Generate Image ──────────────────────────────────────────────────
export async function generateImage({
  prompt,
  referenceImage,
  referenceImages,
  model = 'imagen-3.0-generate-002',
  numberOfImages = 1,
  aspectRatio = '1:1',
  negativePrompt,
}) {
  if (!prompt) throw new Error('prompt is required');
  const ai = getClient();

  const portraits = referenceImages?.length
    ? referenceImages
    : referenceImage
      ? [{ name: 'Character', image: referenceImage }]
      : [];

  const hasPortraits = portraits.length > 0;
  const effectiveModel = (hasPortraits && !model.startsWith('gemini-'))
    ? 'gemini-2.5-flash'
    : model;

  const isGeminiNative = effectiveModel.startsWith('gemini-');

  if (isGeminiNative) {
    const parts = [];
    if (hasPortraits) {
      if (portraits.length === 1) {
        parts.push({
          text: `IMPORTANT CASTING INSTRUCTION: The image below is the REFERENCE PORTRAIT for "${portraits[0].name}". You MUST use this exact person's face, skin tone, and physical appearance faithfully in the generated scene. Do NOT invent a new face for this character.`,
        });
        parts.push(base64ToPart(portraits[0].image, 'image/jpeg'));
      } else {
        parts.push({
          text: `IMPORTANT CASTING INSTRUCTION: The following images are REFERENCE PORTRAITS for specific characters in this scene. You MUST use each person's exact face and appearance faithfully. Do NOT invent or change any face.`,
        });
        for (const ref of portraits) {
          parts.push({ text: `▶ CHARACTER "${ref.name}" — use this exact face:` });
          parts.push(base64ToPart(ref.image, 'image/jpeg'));
        }
      }
      parts.push({ text: `\nNow generate this cinematic scene with those characters in their correct positions:\n\n${prompt}` });
    } else {
      parts.push({ text: prompt });
    }
    if (negativePrompt) parts.push({ text: `Avoid: ${negativePrompt}` });

    const response = await ai.models.generateContent({
      model: effectiveModel,
      contents: [{ role: 'user', parts }],
      config: { responseModalities: ['IMAGE', 'TEXT'], temperature: 1 },
    });

    const images = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        images.push({
          image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          mimeType: part.inlineData.mimeType,
        });
      }
    }
    if (images.length === 0) throw new Error('No image returned from model.');
    return { images, model: effectiveModel, portraitsUsed: portraits.length };
  }

  // Imagen — text-to-image only
  const imagenResponse = await ai.models.generateImages({
    model: effectiveModel,
    prompt,
    config: {
      numberOfImages: Math.min(numberOfImages, 4),
      aspectRatio,
      negativePrompt: negativePrompt || undefined,
    },
  });

  const images = (imagenResponse.generatedImages || []).map((img) => ({
    image: `data:image/png;base64,${img.image?.imageBytes}`,
    mimeType: 'image/png',
  }));
  if (images.length === 0) throw new Error('No image returned from Imagen.');
  return { images, model: effectiveModel };
}

// ── Generate Video ──────────────────────────────────────────────────
export async function generateVideo({
  prompt,
  startImage,
  model = 'veo-2.0-generate-001',
  aspectRatio = '16:9',
  durationSeconds = 5,
}) {
  if (!prompt) throw new Error('prompt is required');
  const ai = getClient();
  const clampedDuration = Math.max(4, Math.min(8, parseInt(durationSeconds) || 5));
  const config = { aspectRatio, durationSeconds: clampedDuration };

  let operation;
  if (startImage) {
    const raw = stripDataUrl(startImage);
    operation = await ai.models.generateVideos({
      model, prompt,
      image: { imageBytes: raw, mimeType: 'image/png' },
      config,
    });
  } else {
    operation = await ai.models.generateVideos({ model, prompt, config });
  }

  // Poll until done (max 6 min)
  let polls = 0;
  while (!operation.done && polls < 72) {
    await new Promise(r => setTimeout(r, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
    polls++;
  }

  if (!operation.done) throw new Error('Video generation timed out after 6 minutes.');

  const videos = operation.response?.generatedVideos || [];
  if (videos.length === 0) throw new Error('No video returned by Veo.');

  const vid = videos[0].video;
  let videoBase64 = vid?.videoBytes;

  if (!videoBase64) {
    const uri = vid?.uri;
    if (!uri) throw new Error('Veo returned no video bytes and no URI.');
    const apiKey = getApiKey();
    const fetchUrl = uri.includes('?') ? `${uri}&key=${apiKey}` : `${uri}?key=${apiKey}`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) throw new Error(`Failed to download video (${fetchRes.status}).`);
    const buffer = await fetchRes.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    videoBase64 = btoa(binary);
  }

  return { video: `data:video/mp4;base64,${videoBase64}`, model, polls, duration: clampedDuration };
}

// ── Generate Text ───────────────────────────────────────────────────
export async function generateText({
  prompt,
  systemInstruction,
  referenceImage,
  model = 'gemini-2.5-flash',
  temperature = 1,
  maxOutputTokens = 8192,
  enableWebSearch = false,
}) {
  if (!prompt) throw new Error('prompt is required');
  const ai = getClient();

  function isRewriteTask(p) {
    const lower = p.toLowerCase().slice(0, 400);
    return /\b(rewrite|re-write|rephrase|improve|edit|refine|polish|enhance|revise|clean up|fix|reword|transform|make (it|this)|turn (this|it))\b/.test(lower);
  }

  let effectiveSystem = systemInstruction || null;
  if (!effectiveSystem && isRewriteTask(prompt)) {
    effectiveSystem = 'You are a professional script editor. Output ONLY the rewritten text. No preamble, commentary, or alternatives.';
  }

  const parts = [{ text: prompt }];
  if (referenceImage) parts.push(base64ToPart(referenceImage));
  const tools = enableWebSearch ? [{ googleSearch: {} }] : undefined;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      temperature,
      maxOutputTokens,
      ...(effectiveSystem ? { systemInstruction: { parts: [{ text: effectiveSystem }] } } : {}),
      ...(tools ? { tools } : {}),
    },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter(p => p.text).map(p => p.text).join('') || '';
  if (!text) throw new Error('No text returned from model.');
  return { text, model };
}

// ── Generate Speech ─────────────────────────────────────────────────
export async function generateSpeech({
  text,
  model = 'gemini-2.5-flash-preview-tts',
  voice = 'Alloy',
}) {
  if (!text) throw new Error('text is required');
  const ai = getClient();

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });

  const audioPart = response.candidates?.[0]?.content?.parts?.find(
    p => p.inlineData?.mimeType?.startsWith('audio/')
  );
  if (!audioPart) throw new Error('No audio returned from TTS model.');
  const { mimeType, data } = audioPart.inlineData;
  return { audio: `data:${mimeType};base64,${data}`, mimeType, model };
}

// ── Storyboard Director Chat ────────────────────────────────────────
export async function storyboardChat({
  message,
  history = [],
  characters = [],
  projectSettings = {},
  model = 'gemini-2.5-flash',
  forceStoryboard = false,
  systemPrompt,
  onChunk,
}) {
  if (!message) throw new Error('message is required');
  const ai = getClient();

  const MAX_HISTORY_TURNS = 80;
  const trimmedHistory = history.length <= MAX_HISTORY_TURNS
    ? history
    : [...history.slice(0, 2), ...history.slice(-(MAX_HISTORY_TURNS - 2))];

  const contents = trimmedHistory
    .filter(h => h.content)
    .map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  const storyboardKeywords = [
    'storyboard', 'create scenes', 'break down', 'breakdown',
    'generate scenes', 'write scenes', 'act 1', 'acts and scenes',
    'just create', 'just make', 'just do it', 'just build',
    'just go ahead', 'stop asking', 'enough questions',
    'use your experience', 'you decide', 'i trust you',
    'build the storyboard', 'generate the storyboard', 'make the storyboard',
  ];
  const lower = message.toLowerCase();
  const wantsStoryboard = forceStoryboard || storyboardKeywords.some(k => lower.includes(k));

  if (wantsStoryboard) {
    // JSON mode
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const text = response.candidates?.[0]?.content?.parts
      ?.filter(p => p.text).map(p => p.text).join('') || '';

    let parsed;
    try { parsed = JSON.parse(text); } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
    }
    if (!parsed) throw new Error('AI returned invalid storyboard JSON. Try again.');

    return {
      type: 'storyboard',
      storyboard: parsed,
      rawText: text,
      assistantMessage: { role: 'assistant', content: text },
    };
  } else {
    // Streaming chat
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction: systemPrompt },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const chunkText = chunk.candidates?.[0]?.content?.parts
        ?.filter(p => p.text).map(p => p.text).join('') || '';
      if (chunkText) {
        fullText += chunkText;
        if (onChunk) onChunk(chunkText);
      }
    }

    if (!fullText.trim()) {
      fullText = 'The model flagged that request. Try rephrasing as a cinematic pitch.';
      if (onChunk) onChunk(fullText);
    }

    return {
      type: 'chat',
      fullText,
      assistantMessage: { role: 'assistant', content: fullText },
    };
  }
}
