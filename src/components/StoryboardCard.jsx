import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { buildSceneImagePrompt } from '../engine/buildSceneImagePrompt';
import { saveImage, getImage } from '../services/imageDB';
import { compressImage } from '../utils/compressImage';
import { generateImage } from '../services/geminiClient';
import ImagePickerModal from './ImagePickerModal';
import {
  Image, Upload, Download, Eye, Trash2, Copy, ChevronDown, ChevronUp,
  Loader2, RefreshCw, FolderOpen, LayoutGrid
} from 'lucide-react';

const SHOT_TYPES = ['Establishing', 'Wide', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'POV', 'Insert', 'Aerial', 'Two-Shot'];
const LENSES = ['14', '24', '35', '50', '85', '135', '200'];
const MOVEMENTS = ['Static', 'Pan', 'Tilt', 'Dolly in', 'Dolly out', 'Track', 'Dolly-Zoom', 'Handheld', 'Steadicam', 'Crane', 'Drone'];
const TIMES_OF_DAY = ['Dawn', 'Golden Hour', 'Day', 'Magic Hour', 'Dusk', 'Night'];
const WEATHER = ['Clear', 'Overcast', 'Light Rain', 'Heavy Rain', 'Fog', 'Snow', 'Storm'];
const COLOR_GRADES = ['Teal-Orange Hollywood', 'Warm', 'Cool', 'Desaturated', 'High-contrast Monochrome', 'Period Accurate', 'Custom'];

// ── CastPortrait: loads image from IndexedDB and renders the face circle ──
function CastPortrait({ portraitId, name }) {
  const [src, setSrc] = React.useState(null);
  React.useEffect(() => { getImage(portraitId).then(img => img && setSrc(img)); }, [portraitId]);
  if (!src) return <span className="scene-cast-chip-initials">{name?.slice(0,2).toUpperCase()}</span>;
  return <img src={src} alt={name} className="scene-cast-chip-portrait" />;
}

export default function StoryboardCard({ scene }) {
  const { updateScene, deleteScene, duplicateScene, characters, projectSettings, setPreviewMedia, addNode, setNodeOutput, sendSceneToCanvas, setActivePanel } = useFlowStore();
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('idle');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null); // chosen per-card

  const imageId = `scene-img-${scene.id}`;

  // Image models — Nano Banana = Imagen branding; Gemini listed separately
  const IMAGE_MODELS = [
    { id: 'nano-banana-pro-preview',        label: '🍌 Nano Banana Pro',       desc: 'Studio-quality — top of range' },
    { id: 'gemini-3.1-flash-image-preview', label: '🍌 Nano Banana 2',         desc: 'Latest Nano Banana — fast & sharp' },
    { id: 'gemini-3-pro-image-preview',     label: '🍌 Nano Banana Pro Gen3',  desc: 'Gemini 3 Pro image quality' },
    { id: 'gemini-2.5-flash-image',         label: '🍌 Nano Banana Flash',     desc: 'Fast gen + face reference support' },
    { id: 'imagen-4.0-ultra-generate-001',  label: '🍌 Nano Banana Ultra',     desc: 'Highest fidelity photorealism' },
    { id: 'imagen-4.0-generate-001',        label: '🍌 Nano Banana Standard',  desc: 'Recommended — great quality' },
    { id: 'imagen-4.0-fast-generate-001',   label: '🍌 Nano Banana Fast',      desc: 'Quickest — good for drafts' },
  ];

  const handlePickModelAndGenerate = (modelId) => {
    setSelectedModel(modelId);
    setShowModelPicker(false);
    handleGenerateImage(modelId);
  };

  useEffect(() => {
    getImage(imageId).then(img => { if (img) setImage(img); });
  }, [imageId]);

  const update = (field, value) => updateScene(scene.id, { [field]: value });

  const handleGenerateImage = async (modelOverride) => {
    setGenerating(true);
    setGenStatus('loading');
    setError(null);

    // Use explicitly chosen model > project setting > default
    const modelToUse = modelOverride || selectedModel || projectSettings.imageModel || 'imagen-4.0-generate-001';

    try {
      const prompt = buildSceneImagePrompt(scene, characters, projectSettings);

      // Collect ALL cast members that have uploaded portraits
      const castCharsWithPortraits = (scene.cast || [])
        .map(id => characters.find(c => c.id === id))
        .filter(c => c && c.portraitId);

      // Load all their portrait images in parallel
      const referenceImages = (
        await Promise.all(
          castCharsWithPortraits.map(async (c) => {
            const img = await getImage(c.portraitId);
            return img ? { name: c.name, image: img } : null;
          })
        )
      ).filter(Boolean);

      const data = await generateImage({
        prompt,
        referenceImages,
        model: modelToUse,
        aspectRatio: projectSettings.aspectRatio || '16:9',
        numberOfImages: 1,
      });

      const img = data.images?.[0]?.image;
      if (img) {
        await saveImage(imageId, img);
        setImage(img);
        setGenStatus('done');
      }
    } catch (err) {
      setError(err.message);
      setGenStatus('error');
    } finally {
      setGenerating(false);
    }
  };

  const handleReplaceImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    await saveImage(imageId, compressed);
    setImage(compressed);
    setGenStatus('done');
  };

  const handleDownload = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `scene-${scene.id}.jpg`;
    a.click();
  };

  const handleCopyPrompt = () => {
    const prompt = buildSceneImagePrompt(scene, characters, projectSettings);
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Aspect ratio for card image display
  const aspectClass = {
    '2.39:1': 'aspect-cinemascope',
    '1.85:1': 'aspect-flat',
    '16:9':   'aspect-16-9',
    '4:3':    'aspect-4-3',
    '1:1':    'aspect-1-1',
  }[projectSettings.aspectRatio || '16:9'] || 'aspect-16-9';

  // Cast members with portrait info — used for reference strip
  const castChars = (scene.cast || []).map(id => characters.find(c => c.id === id)).filter(Boolean);
  const primaryChar = castChars[0];
  const hasPortrait = !!primaryChar?.portraitId;

  return (
    <div className="scene-card">
      {/* Card header */}
      <div className="scene-card-header">
        <div className="scene-card-number">Scene {scene.order || scene.id}</div>
        <div className="scene-card-slug">
          <button
            className={`scene-intext-btn ${scene.intExt === 'INT' ? 'active' : ''}`}
            onClick={() => update('intExt', 'INT')}
          >INT</button>
          <button
            className={`scene-intext-btn ${scene.intExt === 'EXT' ? 'active' : ''}`}
            onClick={() => update('intExt', 'EXT')}
          >EXT</button>
          <span className="scene-location-text">
            {scene.location || 'Location'} — {scene.timeOfDay || 'Day'}
          </span>
        </div>
        <div className="scene-card-badges">
          {scene.shotType && <span className="scene-badge scene-badge--shot">{scene.shotType}</span>}
          {scene.lens && <span className="scene-badge scene-badge--lens">{scene.lens}mm</span>}
          {scene.vfx && <span className="scene-badge scene-badge--vfx">VFX</span>}
        </div>
        <div className="scene-card-actions">
          <button className="scene-action-btn" onClick={() => duplicateScene(scene.id)} title="Duplicate"><Copy size={12} /></button>
          <button className="scene-action-btn scene-action-btn--danger" onClick={() => deleteScene(scene.id)} title="Delete"><Trash2 size={12} /></button>
          <button className="scene-action-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* ── Cast Strip — always visible ─────────────────────────── */}
      {characters.length > 0 && (
        <div className="scene-cast-strip">
          <span className="scene-cast-strip-label">Cast</span>
          <div className="scene-cast-chips">
            {characters.map(char => {
              const inScene = (scene.cast || []).includes(char.id);
              return (
                <button
                  key={char.id}
                  title={inScene ? `Remove ${char.name}` : `Tag ${char.name} in this scene`}
                  className={`scene-cast-chip ${inScene ? 'scene-cast-chip--active' : ''}`}
                  onClick={() => {
                    const cast = scene.cast || [];
                    update('cast', inScene
                      ? cast.filter(id => id !== char.id)
                      : [...cast, char.id]
                    );
                  }}
                >
                  {char.portraitId
                    ? <CastPortrait portraitId={char.portraitId} name={char.name} />
                    : <span className="scene-cast-chip-initials">{char.name.slice(0, 2).toUpperCase()}</span>
                  }
                  <span className="scene-cast-chip-name">{char.name}</span>
                  {!char.portraitId && <span className="scene-cast-chip-warn" title="No portrait — face won't be used">!</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Image slot */}
      <div className={`scene-img-slot ${aspectClass}`}>
        {generating && (
          <div className="scene-img-generating">
            <Loader2 size={28} className="spin" />
            {castChars.filter(c => c.portraitId).length > 1
              ? <span>Generating with {castChars.filter(c => c.portraitId).length} character portraits…</span>
              : castChars.filter(c => c.portraitId).length === 1
                ? <span>Generating with your reference portrait…</span>
                : <span>Generating scene image…</span>
            }
            {selectedModel && <span className="scene-gen-model-badge">{IMAGE_MODELS.find(m => m.id === selectedModel)?.label || selectedModel}</span>}
          </div>
        )}
        {!generating && image && (
          <div className="scene-img-wrap">
            <img src={image} alt={`Scene ${scene.order}`} className="scene-img" />
            <div className="scene-img-actions">
              <button className="node-dl-btn" onClick={() => setPreviewMedia({ url: image, type: 'image' })} title="Preview"><Eye size={12} /></button>
              <button className="node-dl-btn" onClick={handleDownload} title="Download"><Download size={12} /></button>
              <button
                className="node-dl-btn"
                title="Send to Canvas — builds full scene pipeline with cast portraits"
                onClick={async () => {
                  // Collect all cast portraits
                  const castCharsWithPortraits = (scene.cast || [])
                    .map(id => characters.find(c => c.id === id))
                    .filter(c => c && c.portraitId);

                  const portraits = (
                    await Promise.all(
                      castCharsWithPortraits.map(async (c) => {
                        const img = await getImage(c.portraitId);
                        return img ? { name: c.name, image: img } : null;
                      })
                    )
                  ).filter(Boolean);

                  const { buildSceneImagePrompt: bsp } = await import('../engine/buildSceneImagePrompt.js');
                  const prompt = bsp(scene, characters, projectSettings);

                  await sendSceneToCanvas(scene, image, portraits, prompt);
                  // Switch to canvas view
                  if (setActivePanel) setActivePanel('canvas');
                }}
              >
                <LayoutGrid size={12} />
              </button>
              <button className="node-dl-btn" onClick={() => { setImage(null); setGenStatus('idle'); setShowModelPicker(true); }} title="Regenerate with different model">
                <RefreshCw size={12} />
              </button>
              <label className="node-dl-btn" title="Replace">
                <Upload size={12} />
                <input type="file" accept="image/*" onChange={handleReplaceImage} style={{ display: 'none' }} />
              </label>
            </div>
            {castChars.filter(c => c.portraitId).length > 0 && (
              <div className="scene-img-ref-badge">
                🧍‍♂️ {castChars.filter(c => c.portraitId).map(c => c.name).join(', ')}
              </div>
            )}
          </div>
        )}
        {!generating && !image && !showModelPicker && (
          <div className="scene-img-placeholder">
            <Image size={28} />
            <button className="scene-gen-btn" onClick={() => setShowModelPicker(true)}>
              ✨ Generate Image
            </button>
            <div className="scene-img-secondary-btns">
              <label className="scene-gen-btn scene-gen-btn--outline" title="Upload from your computer">
                <Upload size={12} /> Upload
                <input type="file" accept="image/*" onChange={handleReplaceImage} style={{ display: 'none' }} />
              </label>
              <button
                className="scene-gen-btn scene-gen-btn--outline"
                onClick={() => setShowPicker(true)}
                title="Use an image already generated in this app"
              >
                <FolderOpen size={12} /> Pick from App
              </button>
            </div>
          </div>
        )}

        {/* Inline model picker */}
        {!generating && !image && showModelPicker && (
          <div className="scene-model-picker">
            <div className="scene-model-picker-header">
              <span>Choose image model</span>
              <button onClick={() => setShowModelPicker(false)} className="scene-model-picker-close">✕</button>
            </div>
            {IMAGE_MODELS.map(m => (
              <button
                key={m.id}
                className={`scene-model-option ${selectedModel === m.id ? 'scene-model-option--selected' : ''}`}
                onClick={() => handlePickModelAndGenerate(m.id)}
              >
                <span className="scene-model-option-label">{m.label}</span>
                <span className="scene-model-option-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        )}
        {error && <div className="scene-img-error">{error} <button onClick={handleGenerateImage}><RefreshCw size={11} /></button></div>}
      </div>

      {/* Image Picker Modal */}
      {showPicker && (
        <ImagePickerModal
          title="Pick a Canvas Image for this Scene"
          onSelect={async (img) => {
            await saveImage(imageId, img);
            setImage(img);
            setGenStatus('done');
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Scene description */}
      <div className="scene-description">
        <textarea
          className="scene-desc-textarea nodrag nopan"
          value={scene.description || ''}
          onChange={e => update('description', e.target.value)}
          placeholder="Scene description..."
          rows={3}
        />
      </div>

      {/* Dialogue */}
      {scene.dialogue && (
        <div className="scene-dialogue">
          <pre className="scene-dialogue-text">{scene.dialogue}</pre>
        </div>
      )}

      {/* Copy prompt button */}
      <button className="scene-copy-prompt-btn" onClick={handleCopyPrompt}>
        {copied ? '✓ Copied!' : '📋 Copy Image Prompt'}
      </button>

      {/* Expanded metadata */}
      {expanded && (
        <div className="scene-meta-expanded">
          <div className="scene-meta-grid">
            <div className="scene-meta-field">
              <label>Location</label>
              <input className="nodrag nopan" value={scene.location || ''} onChange={e => update('location', e.target.value)} placeholder="Location" />
            </div>
            <div className="scene-meta-field">
              <label>Time of Day</label>
              <select value={scene.timeOfDay || ''} onChange={e => update('timeOfDay', e.target.value)}>
                <option value="">—</option>
                {TIMES_OF_DAY.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="scene-meta-field">
              <label>Weather</label>
              <select value={scene.weather || ''} onChange={e => update('weather', e.target.value)}>
                <option value="">—</option>
                {WEATHER.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="scene-meta-field">
              <label>Shot Type</label>
              <select value={scene.shotType || ''} onChange={e => update('shotType', e.target.value)}>
                <option value="">—</option>
                {SHOT_TYPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="scene-meta-field">
              <label>Lens (mm)</label>
              <select value={scene.lens || ''} onChange={e => update('lens', e.target.value)}>
                <option value="">—</option>
                {LENSES.map(l => <option key={l}>{l}mm</option>)}
              </select>
            </div>
            <div className="scene-meta-field">
              <label>Movement</label>
              <select value={scene.movement || ''} onChange={e => update('movement', e.target.value)}>
                <option value="">—</option>
                {MOVEMENTS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="scene-meta-field">
              <label>Color Grade</label>
              <select value={scene.colorGrade || ''} onChange={e => update('colorGrade', e.target.value)}>
                <option value="">—</option>
                {COLOR_GRADES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="scene-meta-field">
              <label>Duration (sec)</label>
              <input type="number" className="nodrag nopan" value={scene.duration || ''} onChange={e => update('duration', e.target.value)} placeholder="45" />
            </div>
          </div>

          {/* Cast in Scene — kept in expanded for reference */ }
          {characters.length > 0 && (
            <div className="scene-meta-field-full">
              <label>Cast in Scene <span style={{color:'#555',fontWeight:400}}>(click chips above to tag/untag)</span></label>
              <div className="scene-cast-checkboxes">
                {characters.map(char => {
                  const inScene = (scene.cast || []).includes(char.id);
                  return (
                    <label key={char.id} className={`scene-cast-check ${inScene ? 'scene-cast-check--active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={inScene}
                        onChange={e => {
                          const cast = scene.cast || [];
                          update('cast', e.target.checked
                            ? [...cast, char.id]
                            : cast.filter(id => id !== char.id)
                          );
                        }}
                      />
                      {char.name}
                      {!char.portraitId && <span className="scene-cast-warn" title="No reference portrait">⚠️</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}


          {/* Full-width fields */}
          <div className="scene-meta-field-full">
            <label>Lighting Setup</label>
            <input className="nodrag nopan" value={scene.lightingSetup || ''} onChange={e => update('lightingSetup', e.target.value)} placeholder="e.g. Hard backlight, golden, long shadows" />
          </div>
          <div className="scene-meta-field-full">
            <label>Sound Cue</label>
            <input className="nodrag nopan" value={scene.soundCue || ''} onChange={e => update('soundCue', e.target.value)} placeholder="e.g. Ambient wind, no music, tense strings" />
          </div>
          <div className="scene-meta-field-full">
            <label>Props</label>
            <input className="nodrag nopan" value={scene.props || ''} onChange={e => update('props', e.target.value)} placeholder="e.g. Worn leather suitcase, gun on table" />
          </div>
          <div className="scene-meta-field-full">
            <label>Costume / Wardrobe</label>
            <input className="nodrag nopan" value={scene.costume || ''} onChange={e => update('costume', e.target.value)} placeholder="e.g. JOHN: grey trench coat, black boots" />
          </div>
          <div className="scene-meta-field-full">
            <label>Dialogue</label>
            <textarea className="nodrag nopan" value={scene.dialogue || ''} onChange={e => update('dialogue', e.target.value)} placeholder="CHARACTER NAME: Dialogue here" rows={3} />
          </div>
          <div className="scene-meta-field-full">
            <label>
              <input type="checkbox" checked={scene.vfx || false} onChange={e => update('vfx', e.target.checked)} /> VFX Shot
            </label>
            {scene.vfx && (
              <input className="nodrag nopan" value={scene.vfxDescription || ''} onChange={e => update('vfxDescription', e.target.value)} placeholder="VFX description..." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
