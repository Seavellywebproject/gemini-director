/**
 * runner.js
 * Executes nodes in topological order, calling the Gemini API directly from the browser.
 * No backend server needed.
 */

import { topologicalSort, buildInputMap } from './graphParser.js';
import { generateImage, generateVideo, generateText, generateSpeech } from '../services/geminiClient.js';

/**
 * Execute a single node given its type, inputs, and settings.
 * Returns the node output object.
 */
async function executeNode(node, inputs, settings) {
  const type = node.type;
  const data = node.data;

  switch (type) {

    // ── Prompt node — just output its text ─────────────────────
    case 'promptNode':
      return { prompt: data.text || '' };

    // ── Image input — already loaded by the UI ──────────────────
    case 'imageInputNode':
      return { image: data.image || null };

    // ── Gemini Image (Imagen / Gemini) ──────────────────────────
    case 'geminiImageNode': {
      const result = await generateImage({
        prompt: inputs.prompt || inputs.text || '',
        referenceImage: inputs.image || null,
        model: settings.model || data?.model?.id || 'imagen-3.0-generate-002',
        numberOfImages: settings.numberOfImages || 1,
        aspectRatio: settings.aspectRatio || '1:1',
        negativePrompt: settings.negativePrompt || '',
      });
      const firstImg = result.images?.[0]?.image || null;
      return { image: firstImg };
    }

    // ── Gemini Video (Veo) ──────────────────────────────────────
    case 'geminiVideoNode': {
      const result = await generateVideo({
        prompt: inputs.prompt || inputs.text || '',
        startImage: inputs.image || null,
        model: settings.model || data?.model?.id || 'veo-2.0-generate-001',
        aspectRatio: settings.aspectRatio || '16:9',
        durationSeconds: settings.duration || 5,
      });
      return { video: result.video };
    }

    // ── LipSync (fal.ai LatentSync) ─────────────────────────────
    case 'lipSyncNode': {
      const videoIn = inputs.video || inputs.image || null;
      const dialogue = data.dialogue || settings.dialogue || inputs.text || inputs.prompt || '';
      if (!videoIn) throw new Error('LipSync requires a video input.');
      if (!dialogue) throw new Error('LipSync requires dialogue text.');
      // LipSync needs fal.ai — not available without a backend proxy
      throw new Error('LipSync requires a FAL_API_KEY backend. Use the local server for LipSync.');
    }

    // ── Gemini Text ─────────────────────────────────────────────
    case 'geminiTextNode': {
      const defaultSystem =
        'You are a precise AI assistant. When given a task, output ONLY the direct result. No preamble, no commentary.';

      const result = await generateText({
        prompt: inputs.prompt || inputs.text || '',
        referenceImage: inputs.image || null,
        systemInstruction: settings.systemInstruction || defaultSystem,
        model: settings.model || data?.model?.id || 'gemini-2.5-flash',
        temperature: settings.temperature ?? 1,
        maxOutputTokens: settings.maxTokens || 8192,
        enableWebSearch: settings.enableWebSearch || false,
      });
      return { text: result.text };
    }

    // ── Rewrite Node ─────────────────────────────────────────────
    case 'rewriteNode': {
      const rewriteMode = data?.rewriteMode || 'cinematic';
      const modeInstructions = {
        cinematic:  'Rewrite this text in vivid, cinematic, present-tense style. Pure visual storytelling.',
        emotional:  'Rewrite this text to maximise raw human emotion. Every word should carry weight.',
        concise:    'Rewrite this text to be as tight and punchy as possible.',
        screenplay: 'Rewrite this as a properly formatted screenplay action line.',
        dialogue:   'Rewrite this as compelling, subtext-driven dialogue.',
        poetic:     'Rewrite this text as lyrical, poetic, metaphorical prose.',
      };
      const systemInstruction =
        (modeInstructions[rewriteMode] || modeInstructions.cinematic) +
        ' Output ONLY the rewritten text. No labels, no headings, no commentary.';

      const result = await generateText({
        prompt: inputs.text || inputs.prompt || '',
        systemInstruction,
        model: settings.model || 'gemini-2.5-flash',
        temperature: 0.9,
        maxOutputTokens: 4096,
      });
      return { text: result.text };
    }

    case 'geminiSpeechNode': {
      const result = await generateSpeech({
        text: inputs.text || inputs.prompt || '',
        model: settings.model || data?.model?.id || 'gemini-2.5-flash-preview-tts',
        voice: settings.voice || 'Alloy',
      });
      return { audio: result.audio };
    }

    // ── Gemini Music (Lyria) ────────────────────────────────────
    case 'geminiMusicNode': {
      const result = await generateSpeech({
        text: inputs.prompt || '',
        model: settings.model || data?.model?.id || 'lyria-3-clip-preview',
        voice: 'Alloy',
      });
      return { audio: result.audio };
    }

    // ── Output / text output — pass through input ───────────────
    case 'outputNode':
    case 'textOutputNode':
      return inputs;

    default:
      console.warn(`[runner] Unknown node type: ${type}`);
      return {};
  }
}

/**
 * Run the ENTIRE pipeline in topological order.
 */
export async function runPipeline({
  nodes,
  edges,
  nodeSettings,
  nodeOutputs,
  onNodeStart,
  onNodeDone,
  onNodeError,
}) {
  let sortedIds;
  try {
    sortedIds = topologicalSort(nodes, edges);
  } catch (err) {
    throw new Error(`Graph error: ${err.message}`);
  }

  const outputs = { ...nodeOutputs };

  for (const nodeId of sortedIds) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const settings = nodeSettings[nodeId] || {};
    const inputMap = buildInputMap([nodeId], edges, outputs, nodes);
    const inputs = inputMap[nodeId] || {};

    onNodeStart?.(nodeId);

    try {
      const output = await executeNode(node, inputs, settings);
      outputs[nodeId] = output;
      onNodeDone?.(nodeId, output);
    } catch (err) {
      console.error(`[runner] Node ${nodeId} (${node.type}) failed:`, err.message);
      onNodeError?.(nodeId, err.message);
      break;
    }
  }

  return outputs;
}

/**
 * Run only a single node (and its direct upstream dependencies).
 */
export async function runSingleNode({
  nodeId,
  nodes,
  edges,
  nodeSettings,
  nodeOutputs,
  onNodeStart,
  onNodeDone,
  onNodeError,
}) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const inputs = buildInputMap([nodeId], edges, nodeOutputs, nodes)[nodeId] || {};
  const settings = nodeSettings[nodeId] || {};

  onNodeStart?.(nodeId);
  try {
    const output = await executeNode(node, inputs, settings);
    onNodeDone?.(nodeId, output);
    return output;
  } catch (err) {
    onNodeError?.(nodeId, err.message);
  }
}
