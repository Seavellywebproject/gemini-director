import express from 'express';
import { getClient, stripDataUrl, base64ToPart } from '../services/gemini.js';
import { enqueueImageJob } from '../services/imageQueue.js';

export const generateImageRoute = express.Router();

generateImageRoute.post('/', async (req, res) => {
  try {
    const {
      prompt,
      referenceImage,     // legacy single portrait (backwards compat)
      referenceImages,    // NEW: [{ name, image }] — one per cast member
      model = 'imagen-3.0-generate-002',
      numberOfImages = 1,
      aspectRatio = '1:1',
      negativePrompt,
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const ai = getClient();

    // Normalise to array. Prefer the richer referenceImages array; fall back to single.
    const portraits = referenceImages?.length
      ? referenceImages
      : referenceImage
        ? [{ name: 'Character', image: referenceImage }]
        : [];

    const hasPortraits = portraits.length > 0;

    // If portraits exist and we have an Imagen model, auto-switch to Gemini multimodal
    // (Imagen text-to-image API cannot accept reference images at all).
    const effectiveModel = (hasPortraits && !model.startsWith('gemini-'))
      ? 'gemini-2.5-flash'
      : model;

    const isGeminiNative = effectiveModel.startsWith('gemini-');

    if (isGeminiNative) {
      const result = await enqueueImageJob(async () => {
        const parts = [];

        if (hasPortraits) {
          if (portraits.length === 1) {
            // Single character reference
            parts.push({
              text: `IMPORTANT CASTING INSTRUCTION: The image below is the REFERENCE PORTRAIT for "${portraits[0].name}". You MUST use this exact person's face, skin tone, and physical appearance faithfully in the generated scene. Do NOT invent a new face for this character.`,
            });
            parts.push(base64ToPart(portraits[0].image, 'image/jpeg'));
          } else {
            // Multi-character references — label each one clearly
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
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 1,
          },
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

        if (images.length === 0) {
          throw new Error('No image returned from model. Try a different model or prompt.');
        }
        return { images, model: effectiveModel, portraitsUsed: portraits.length };
      });

      return res.json(result);
    }

    // ── Imagen 3 — text-to-image only (no reference support) ─────
    const result = await enqueueImageJob(async () => {
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

      if (images.length === 0) {
        throw new Error('No image returned from Imagen. Check safety filters.');
      }
      return { images, model: effectiveModel };
    });

    return res.json(result);

  } catch (err) {
    console.error('[generate-image]', err.message || err);
    res.status(500).json({
      error: err.message || 'Image generation failed',
      hint: 'Check your API key, model name, and that the model supports image generation.',
    });
  }
});
