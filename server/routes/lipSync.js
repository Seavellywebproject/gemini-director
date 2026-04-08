import express from 'express';
import fetch from 'node-fetch';

export const lipSyncRoute = express.Router();

/**
 * POST /api/lipsync
 * Body: { video: "data:video/mp4;base64,...", dialogue: "string", audioBase64?: "data:audio/...;base64,..." }
 *
 * Uses fal.ai LatentSync for accurate lip synchronisation.
 * Requires FAL_API_KEY in server/.env
 */
lipSyncRoute.post('/', async (req, res) => {
  try {
    const { video, dialogue, audioBase64 } = req.body;

    if (!video) return res.status(400).json({ error: 'video is required (base64 data URL)' });
    if (!dialogue && !audioBase64) return res.status(400).json({ error: 'Either dialogue text or audioBase64 is required' });

    const FAL_KEY = process.env.FAL_API_KEY;
    if (!FAL_KEY) {
      return res.status(500).json({
        error: 'FAL_API_KEY not set.',
        hint: 'Add FAL_API_KEY=your_key to server/.env — get a free key at https://fal.ai',
      });
    }

    // ── Step 1: Upload the video to fal.ai storage ────────────────────────
    const videoBase64 = video.replace(/^data:video\/[^;]+;base64,/, '');
    const videoBuffer = Buffer.from(videoBase64, 'base64');

    const uploadRes = await fetch('https://rest.alpha.fal.ai/storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        'Content-Type': 'video/mp4',
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      return res.status(500).json({ error: `fal.ai video upload failed: ${uploadErr}` });
    }

    const { url: videoUrl } = await uploadRes.json();

    // ── Step 2: Generate TTS audio from dialogue if no audio provided ──────
    let audioUrl = null;
    if (audioBase64) {
      // Upload provided audio
      const audioRaw = audioBase64.replace(/^data:[^;]+;base64,/, '');
      const audioBuffer = Buffer.from(audioRaw, 'base64');
      const audioUpload = await fetch('https://rest.alpha.fal.ai/storage/upload', {
        method: 'POST',
        headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'audio/mpeg' },
        body: audioBuffer,
      });
      if (audioUpload.ok) {
        const j = await audioUpload.json();
        audioUrl = j.url;
      }
    } else {
      // Use fal.ai F5-TTS to generate audio from dialogue
      const ttsRes = await fetch('https://queue.fal.run/fal-ai/f5-tts', {
        method: 'POST',
        headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ gen_text: dialogue, model_type: 'F5-TTS' }),
      });
      if (ttsRes.ok) {
        const ttsJob = await ttsRes.json();
        // Poll for TTS result
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const poll = await fetch(`https://queue.fal.run/fal-ai/f5-tts/requests/${ttsJob.request_id}`, {
            headers: { Authorization: `Key ${FAL_KEY}` },
          });
          if (poll.ok) {
            const pollData = await poll.json();
            if (pollData.status === 'COMPLETED') {
              audioUrl = pollData.output?.audio_url || pollData.output?.url;
              break;
            }
            if (pollData.status === 'FAILED') break;
          }
        }
      }
    }

    if (!audioUrl) {
      return res.status(500).json({ error: 'Failed to generate or upload audio for lipsync.' });
    }

    // ── Step 3: Run LatentSync on fal.ai ─────────────────────────────────
    const syncRes = await fetch('https://queue.fal.run/fal-ai/latentsync', {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        audio_url: audioUrl,
        guidance_scale: 2.0,
        inference_steps: 40,
        seed: 42,
      }),
    });

    if (!syncRes.ok) {
      const syncErr = await syncRes.text();
      return res.status(500).json({ error: `fal.ai LatentSync submit failed: ${syncErr}` });
    }

    const syncJob = await syncRes.json();

    // ── Step 4: Poll for LatentSync result ───────────────────────────────
    let syncOutput = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(
        `https://queue.fal.run/fal-ai/latentsync/requests/${syncJob.request_id}`,
        { headers: { Authorization: `Key ${FAL_KEY}` } }
      );
      if (poll.ok) {
        const pollData = await poll.json();
        if (pollData.status === 'COMPLETED') {
          syncOutput = pollData.output?.video?.url || pollData.output?.url;
          break;
        }
        if (pollData.status === 'FAILED') {
          return res.status(500).json({ error: 'LatentSync job failed on fal.ai. Try again.' });
        }
      }
    }

    if (!syncOutput) {
      return res.status(504).json({ error: 'LipSync timed out. The job may still be running on fal.ai.' });
    }

    // ── Step 5: Download and return as base64 ───────────────────────────
    const videoFetch = await fetch(syncOutput);
    const videoArrayBuf = await videoFetch.arrayBuffer();
    const outputBase64 = Buffer.from(videoArrayBuf).toString('base64');
    const outputDataUrl = `data:video/mp4;base64,${outputBase64}`;

    return res.json({ video: outputDataUrl });

  } catch (err) {
    console.error('[lipsync]', err.message || err);
    res.status(500).json({ error: err.message || 'LipSync failed' });
  }
});
