import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { compressImage } from '../utils/compressImage';
import { buildCharacterPortraitPrompt } from '../engine/buildSceneImagePrompt';
import { saveImage, getImage } from '../services/imageDB';
import { generateImage } from '../services/geminiClient';
import {
  User, Lock, Unlock, Trash2, Image, Upload, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';

const ACTS = ['act1', 'act2', 'act3'];
const ACT_LABELS = { act1: 'Act 1', act2: 'Act 2', act3: 'Act 3' };

export default function CharacterCard({ character }) {
  const { updateCharacter, removeCharacter, projectSettings } = useFlowStore();
  const [expanded, setExpanded] = useState(false);
  const [generatingPortrait, setGeneratingPortrait] = useState(false);
  const [portrait, setPortrait] = useState(null);

  React.useEffect(() => {
    // Load portrait from IndexedDB
    if (character.portraitId) {
      getImage(character.portraitId).then(img => { if (img) setPortrait(img); });
    }
  }, [character.portraitId]);

  const updateField = (field, value) => {
    updateCharacter(character.id, { [field]: value });
  };

  const updateCostume = (act, value) => {
    updateCharacter(character.id, {
      costumePerAct: { ...character.costumePerAct, [act]: value }
    });
  };

  const handleUploadPortrait = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const portraitId = `portrait-${character.id}`;
    await saveImage(portraitId, compressed);
    setPortrait(compressed);
    updateCharacter(character.id, { portraitId });
  };

  const handleGeneratePortrait = async () => {
    setGeneratingPortrait(true);
    try {
      const prompt = buildCharacterPortraitPrompt(character);
      const data = await generateImage({
        prompt,
        model: projectSettings.imageModel || 'imagen-3.0-generate-002',
        aspectRatio: '1:1',
        numberOfImages: 1,
      });
      const img = data.images?.[0]?.image;
      if (img) {
        const portraitId = `portrait-${character.id}`;
        await saveImage(portraitId, img);
        setPortrait(img);
        updateCharacter(character.id, { portraitId });
      }
    } catch (err) {
      console.error('Portrait generation failed:', err);
    } finally {
      setGeneratingPortrait(false);
    }
  };

  const toggleLock = () => updateField('locked', !character.locked);

  return (
    <div className={`char-card ${character.locked ? 'char-card--locked' : ''}`}>
      {/* Header */}
      <div className="char-card-header">
        <div className="char-portrait-thumb">
          {portrait
            ? <img src={portrait} alt={character.name} />
            : <User size={20} className="char-portrait-placeholder" />
          }
        </div>
        <div className="char-card-info">
          <input
            className="char-name-input"
            value={character.name || ''}
            onChange={e => updateField('name', e.target.value)}
            placeholder="Character name"
          />
          <span className="char-role-badge">{character.role || 'Character'}</span>
        </div>
        <div className="char-card-actions">
          <button className="char-action-btn" onClick={toggleLock} title={character.locked ? 'Unlock' : 'Lock descriptor'}>
            {character.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button className="char-action-btn char-action-btn--danger" onClick={() => removeCharacter(character.id)} title="Remove">
            <Trash2 size={13} />
          </button>
          <button className="char-action-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Portrait slot */}
      <div className="char-portrait-row">
        {portrait ? (
          <div className="char-portrait-img-wrap">
            <img src={portrait} alt={character.name} className="char-portrait-full" />
            <div className="char-portrait-actions">
              <label className="char-action-btn" title="Replace portrait">
                <Upload size={12} />
                <input type="file" accept="image/*" onChange={handleUploadPortrait} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        ) : (
          <div className="char-portrait-empty">
            <button className="char-gen-btn" onClick={handleGeneratePortrait} disabled={generatingPortrait}>
              {generatingPortrait ? '⏳ Generating...' : <><Sparkles size={12} /> Generate Portrait</>}
            </button>
            <label className="char-gen-btn char-gen-btn--outline">
              <Upload size={12} /> Upload Photo
              <input type="file" accept="image/*" onChange={handleUploadPortrait} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* Locked descriptor */}
      <div className="char-descriptor-block">
        <label className="char-field-label">Locked Descriptor {character.locked && <Lock size={10} />}</label>
        <textarea
          className="char-descriptor-textarea nodrag nopan"
          value={character.lockedDescriptor || ''}
          onChange={e => !character.locked && updateField('lockedDescriptor', e.target.value)}
          readOnly={character.locked}
          placeholder="e.g. White male, early 40s, salt-and-pepper stubble, weathered face..."
          rows={3}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="char-details">
          <div className="char-fields-grid">
            {[
              ['Role', 'role', ['Protagonist', 'Antagonist', 'Supporting', 'Minor']],
              ['Gender', 'gender', []],
              ['Age', 'age', []],
              ['Build', 'build', []],
              ['Hair', 'hair', []],
              ['Eyes', 'eyes', []],
              ['Skin tone', 'skinTone', []],
              ['Distinguishing features', 'features', []],
            ].map(([label, field, opts]) => (
              <div className="char-field" key={field}>
                <label className="char-field-label">{label}</label>
                {opts.length > 0 ? (
                  <select className="char-field-select" value={character[field] || ''} onChange={e => updateField(field, e.target.value)}>
                    <option value="">—</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="char-field-input nodrag nopan" value={character[field] || ''} onChange={e => updateField(field, e.target.value)} placeholder={label} />
                )}
              </div>
            ))}
          </div>

          {/* Costume per Act */}
          <div className="char-section-title">Costume per Act</div>
          {ACTS.map(act => (
            <div className="char-field" key={act}>
              <label className="char-field-label">{ACT_LABELS[act]}</label>
              <input
                className="char-field-input nodrag nopan"
                value={character.costumePerAct?.[act] || ''}
                onChange={e => updateCostume(act, e.target.value)}
                placeholder={`${ACT_LABELS[act]} costume`}
              />
            </div>
          ))}

          {/* Emotional Arc */}
          <div className="char-section-title">Emotional Arc</div>
          <div className="char-arc-row">
            {ACTS.map(act => (
              <div className="char-arc-item" key={act}>
                <label className="char-field-label">{ACT_LABELS[act]}</label>
                <input
                  className="char-field-input nodrag nopan"
                  value={character.arc?.[act] || ''}
                  onChange={e => updateCharacter(character.id, { arc: { ...character.arc, [act]: e.target.value } })}
                  placeholder="e.g. Hopeful"
                />
              </div>
            ))}
          </div>

          {/* Phase 2 placeholder */}
          <div className="char-lora-badge">
            🔒 LoRA Training (Phase 2 — Coming Soon)
          </div>
        </div>
      )}
    </div>
  );
}
