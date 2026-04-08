import express from 'express';
import { getClient, base64ToPart } from '../services/gemini.js';

export const generateTextRoute = express.Router();

// Detect if the prompt is a rewrite/editing task so we can lock output to just the result
function isRewriteTask(prompt) {
  const lower = prompt.toLowerCase().slice(0, 400);
  return /\b(rewrite|re-write|rephrase|improve|edit|refine|polish|enhance|revise|clean up|fix|reword|transform|make (it|this)|turn (this|it))\b/.test(lower);
}

generateTextRoute.post('/', async (req, res) => {
  try {
    const {
      prompt,
      systemInstruction,                       // caller-provided system instruction
      referenceImage,                           // optional multimodal input
      model = 'gemini-3.1-pro-preview',
      temperature = 1,
      maxOutputTokens = 8192,
      enableWebSearch = false,
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const ai = getClient();

    // ── Determine effective system instruction ──────────────────────
    let effectiveSystem = systemInstruction || null;

    // If caller didn't provide one AND this looks like a rewrite task,
    // inject a strict instruction so ONLY the result is returned.
    if (!effectiveSystem && isRewriteTask(prompt)) {
      effectiveSystem =
        'You are a professional script editor and rewriter. ' +
        'When asked to rewrite, improve, edit, or rephrase text, output ONLY the rewritten text itself. ' +
        'Do NOT include any preamble, introduction, commentary, analysis, headings, options, or closing remarks. ' +
        'Do NOT explain what you changed. Do NOT offer alternatives. Just return the clean, rewritten text and nothing else.';
    }

    const parts = [{ text: prompt }];
    if (referenceImage) parts.push(base64ToPart(referenceImage));

    const tools = enableWebSearch
      ? [{ googleSearch: {} }]
      : undefined;

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
      ?.filter((p) => p.text)
      .map((p) => p.text)
      .join('') || '';

    if (!text) {
      return res.status(500).json({ error: 'No text returned from model.' });
    }

    return res.json({ text, model });

  } catch (err) {
    console.error('[generate-text]', err.message || err);
    res.status(500).json({ error: err.message || 'Text generation failed' });
  }
});
