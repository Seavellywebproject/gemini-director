/**
 * buildSceneImagePrompt.js
 * Constructs a professional cinematic image prompt from scene metadata
 * + locked character descriptors + project settings.
 * Used for all storyboard scene image generations via Nano Banana Pro.
 */

const LENS_VISUAL_MAP = {
  '14': 'ultra-wide 14mm lens, extreme barrel distortion, epic environmental scale',
  '24': '24mm wide lens, environmental context, slight perspective distortion',
  '35': '35mm lens, natural human perspective, slightly environmental',
  '50': '50mm standard lens, natural human eye perspective, no distortion',
  '85': '85mm portrait lens, shallow depth of field, intimate and flattering',
  '135': '135mm telephoto lens, strong background compression, cinematic portrait',
  '200': '200mm telephoto lens, extreme compression, distant voyeuristic framing',
};

const SHOT_TYPE_MAP = {
  'Establishing': 'establishing wide shot showing full environment and scale',
  'Wide': 'wide shot, full environment visible',
  'MS': 'medium shot, subject from waist up',
  'MCU': 'medium close-up, subject from chest up',
  'CU': 'close-up, face and shoulders only, emotionally intimate',
  'ECU': 'extreme close-up, single facial feature, detail shot',
  'OTS': 'over-the-shoulder shot, two-person conversation framing',
  'POV': 'point-of-view shot, subjective camera',
  'Insert': 'insert shot, tight detail on object or hands',
  'Aerial': 'aerial drone shot, bird\'s eye view',
  'Two-Shot': 'two-shot, two subjects in same frame',
};

/**
 * Build a cinematic image generation prompt for a storyboard scene.
 *
 * @param {Object} scene - The storyboard scene object
 * @param {Array}  characters - Full character registry array
 * @param {Object} project - Project-level settings { aspectRatio, styleReference, genre }
 * @returns {string} - Full cinematic image prompt ready for Nano Banana Pro
 */
export function buildSceneImagePrompt(scene, characters = [], project = {}) {
  // ── Character descriptors (locked) ─────────────────────────────
  const castDescriptors = (scene.cast || [])
    .map((charId) => characters.find((c) => c.id === charId))
    .filter(Boolean)
    .map((char) => {
      const costume = char.costumePerAct?.[`act${scene.act}`] || char.costumePerAct?.act1 || '';
      return `${char.lockedDescriptor || `${char.name}: ${char.hair || ''} hair, ${char.build || ''} build`}${costume ? `. WEARING: ${costume}` : ''}`;
    })
    .join('\n');

  // ── Scene location block ───────────────────────────────────────
  const locationBlock = [
    scene.intExt === 'INT' ? 'Interior' : 'Exterior',
    scene.location,
    scene.timeOfDay,
    scene.weather && scene.weather !== 'Clear' ? scene.weather : '',
  ].filter(Boolean).join(', ');

  // ── Shot & lens description ────────────────────────────────────
  const shotDesc = SHOT_TYPE_MAP[scene.shotType] || `${scene.shotType} shot`;
  const lensDesc = LENS_VISUAL_MAP[scene.lens] || `${scene.lens}mm lens`;
  const movementDesc = scene.movement ? `camera ${scene.movement.toLowerCase()}` : '';

  // ── Technical film block ───────────────────────────────────────
  const technicalBlock = [
    shotDesc,
    lensDesc,
    movementDesc,
    scene.lightingSetup,
    scene.colorGrade ? `${scene.colorGrade} color grade` : '',
  ].filter(Boolean).join(', ');

  // ── Style reference ────────────────────────────────────────────
  const styleRef = project.styleReference
    ? `Visual reference: ${project.styleReference}.`
    : 'Contemporary Hollywood cinema aesthetic.';

  // ── Full assembled prompt ──────────────────────────────────────
  const parts = [
    castDescriptors,
    '',
    `${locationBlock}.`,
    scene.description || '',
    '',
    technicalBlock + '.',
    'Cinematic film still, photorealistic, 4K resolution, film grain texture, anamorphic aspect ratio.',
    styleRef,
    scene.vfx && scene.vfxDescription ? `VFX elements: ${scene.vfxDescription}.` : '',
  ].filter((p) => p !== null && p !== undefined);

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Build a character reference portrait prompt.
 * Used when generating the canonical character portrait.
 */
export function buildCharacterPortraitPrompt(character) {
  return `Professional studio portrait photograph of a character: ${character.lockedDescriptor || `${character.name}`}.
Front-facing, neutral background, professional lighting, highly detailed, photorealistic.
${character.costumePerAct?.act1 ? `WEARING: ${character.costumePerAct.act1}` : 'Neutral clothing, not costume-specific.'}
Cinema reference portrait, 85mm lens, soft studio lighting, 4K, hyperrealistic.`;
}
