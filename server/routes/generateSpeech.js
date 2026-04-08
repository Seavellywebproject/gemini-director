import express from 'express';
import { getClient } from '../services/gemini.js';

export const generateSpeechRoute = express.Router();

generateSpeechRoute.post('/', async (req, res) => {
  try {
    const {
      text,
      model = 'gemini-2.5-flash-preview-tts',
      voice = 'Alloy',
    } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    const ai = getClient();

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.mimeType?.startsWith('audio/')
    );

    if (!audioPart) {
      return res.status(500).json({ error: 'No audio returned from TTS model.' });
    }

    const { mimeType, data } = audioPart.inlineData;
    return res.json({
      audio: `data:${mimeType};base64,${data}`,
      mimeType,
      model,
    });

  } catch (err) {
    console.error('[generate-speech]', err.message || err);
    res.status(500).json({ error: err.message || 'Speech generation failed' });
  }
});
