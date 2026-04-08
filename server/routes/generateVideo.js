import express from 'express';
import { getClient, stripDataUrl } from '../services/gemini.js';
import fetch from 'node-fetch';

export const generateVideoRoute = express.Router();

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 72; // 6 min max

generateVideoRoute.post('/', async (req, res) => {
  try {
    const {
      prompt,
      startImage,
      model = 'veo-3.1-fast-generate-preview',
      aspectRatio = '16:9',
      durationSeconds = 5,
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const ai = getClient();

    // Veo 3.x supports 4–8 seconds; clamp to that range
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

    // Poll until done
    let polls = 0;
    while (!operation.done && polls < MAX_POLLS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      operation = await ai.operations.getVideosOperation({ operation });
      polls++;
    }

    if (!operation.done) {
      return res.status(504).json({ error: 'Video generation timed out after 6 minutes. Try a shorter duration or simpler prompt.' });
    }

    const videos = operation.response?.generatedVideos || [];
    if (videos.length === 0) {
      return res.status(500).json({ error: 'No video returned by Veo. Check safety filters or try a different prompt.' });
    }

    const vid = videos[0].video;
    let videoBase64 = vid?.videoBytes;   // may be null for some Veo models

    if (!videoBase64) {
      // Veo returned a signed URI — fetch with API key auth
      const uri = vid?.uri;
      if (!uri) {
        return res.status(500).json({ error: 'Veo returned no video bytes and no URI. Try again.' });
      }
      // Append key to URI for Google API authentication
      const apiKey = process.env.GEMINI_API_KEY;
      const fetchUrl = uri.includes('?') ? `${uri}&key=${apiKey}` : `${uri}?key=${apiKey}`;
      const fetchRes = await fetch(fetchUrl);
      if (!fetchRes.ok) {
        return res.status(500).json({ error: `Failed to download video from Veo (${fetchRes.status}). Try again.` });
      }
      const buffer = await fetchRes.arrayBuffer();
      videoBase64 = Buffer.from(buffer).toString('base64');
    }

    const videoUrl = `data:video/mp4;base64,${videoBase64}`;
    return res.json({ video: videoUrl, model, polls, duration: clampedDuration });

  } catch (err) {
    console.error('[generate-video]', err.message || err);
    res.status(500).json({
      error: err.message || 'Video generation failed',
      hint: 'Ensure your API key has Veo access. See https://ai.google.dev/gemini-api/docs/video',
    });
  }
});
