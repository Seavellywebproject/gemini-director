import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateImageRoute } from './routes/generateImage.js';
import { generateVideoRoute } from './routes/generateVideo.js';
import { generateTextRoute } from './routes/generateText.js';
import { generateSpeechRoute } from './routes/generateSpeech.js';
import { storyboardRoute } from './routes/storyboard.js';
import { lipSyncRoute } from './routes/lipSync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors()); // Allow all origins for local dev
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    hasFalKey: !!process.env.FAL_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/generate-image', generateImageRoute);
app.use('/api/generate-video', generateVideoRoute);
app.use('/api/generate-text', generateTextRoute);
app.use('/api/generate-speech', generateSpeechRoute);
app.use('/api/storyboard', storyboardRoute);
app.use('/api/lipsync', lipSyncRoute);

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Gemini Flow server running on http://localhost:${PORT}`);
  console.log(`   API Key: ${process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing — set GEMINI_API_KEY in server/.env'}\n`);
});
