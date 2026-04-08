import { GoogleGenAI, Modality } from '@google/genai';

let _client = null;

export function getClient() {
  // Allow per-request key override (from frontend localStorage fallback)
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set. Add it to server/.env');
  if (!_client) _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

/**
 * Strip "data:image/...;base64," prefix and return raw base64 string
 */
export function stripDataUrl(dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

/**
 * Convert base64 to a Part object for Gemini multimodal input
 */
export function base64ToPart(base64, mimeType = 'image/png') {
  return {
    inlineData: {
      data: stripDataUrl(base64),
      mimeType,
    },
  };
}

/**
 * Resolution string → pixel dimensions for Imagen
 */
export function resolveResolution(res) {
  const map = {
    '512px': { width: 512, height: 512 },
    '1K':    { width: 1024, height: 1024 },
    '2K':    { width: 2048, height: 2048 },
    '4K':    { width: 3840, height: 2160 },
  };
  return map[res] || map['1K'];
}

/**
 * Aspect ratio string → { width, height } for video generation
 */
export function resolveAspectRatio(ar, base = 1024) {
  const map = {
    '1:1':  { width: base, height: base },
    '4:3':  { width: Math.round(base * 4/3), height: base },
    '3:4':  { width: base, height: Math.round(base * 4/3) },
    '16:9': { width: Math.round(base * 16/9), height: base },
    '9:16': { width: base, height: Math.round(base * 16/9) },
    '21:9': { width: Math.round(base * 21/9), height: base },
    '2:3':  { width: Math.round(base * 2/3), height: base },
    '3:2':  { width: Math.round(base * 3/2), height: base },
  };
  return map[ar] || map['16:9'];
}

export { Modality };
