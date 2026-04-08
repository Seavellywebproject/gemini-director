import React, { useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { FileDown, Printer, Film, ArrowUpRight, FolderOpen, Save } from 'lucide-react';

/**
 * StoryboardExport — handles all export formats:
 * PDF (print), Shot List CSV, Fountain screenplay, .gflow project, Send to Canvas
 */
export default function StoryboardExport() {
  const {
    storyboard, characters, projectSettings,
    exportProject, importProject, addNode,
  } = useFlowStore();

  const importRef = useRef(null);

  // ── Shot List CSV ──────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!storyboard) return;
    const rows = [
      ['Scene', 'INT/EXT', 'Location', 'Time of Day', 'Weather', 'Shot', 'Lens (mm)',
       'Movement', 'Cast', 'Lighting', 'Color Grade', 'VFX', 'Duration (s)', 'Page Count'],
    ];
    storyboard.acts?.forEach((act) => {
      act.scenes?.forEach((sc) => {
        rows.push([
          sc.id || '',
          sc.intExt || '',
          sc.location || '',
          sc.timeOfDay || '',
          sc.weather || '',
          sc.shotType || '',
          sc.lens || '',
          sc.movement || '',
          (sc.cast || []).join('; '),
          sc.lightingSetup || '',
          sc.colorGrade || '',
          sc.vfx ? `Yes — ${sc.vfxDescription || ''}` : 'No',
          sc.duration || '',
          sc.pageCount || '',
        ]);
      });
    });

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectSettings?.title || 'storyboard'}-shot-list.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Fountain Export ────────────────────────────────────────────
  const handleExportFountain = () => {
    if (!storyboard) return;
    const title = projectSettings?.title || 'Untitled';
    const lines = [
      `Title: ${title}`,
      `Author: ${projectSettings?.director || 'Unknown'}`,
      `Format: ${projectSettings?.aspectRatio || '16:9'}`,
      '',
      '',
    ];

    storyboard.acts?.forEach((act) => {
      lines.push(`# ${act.title || `Act ${act.actNumber}`}`);
      lines.push('');
      act.scenes?.forEach((sc) => {
        // Slugline
        lines.push(`${sc.intExt || 'EXT'}. ${sc.location || 'LOCATION'} - ${sc.timeOfDay || 'DAY'}`);
        lines.push('');
        // Action line
        if (sc.description) {
          lines.push(sc.description);
          lines.push('');
        }
        // Dialogue
        if (sc.dialogue) {
          const dialogueLines = sc.dialogue.split('\n');
          dialogueLines.forEach((dl) => {
            if (dl.includes(':')) {
              const [char, ...rest] = dl.split(':');
              lines.push(char.trim().toUpperCase());
              lines.push(rest.join(':').trim());
            } else {
              lines.push(dl);
            }
          });
          lines.push('');
        }
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.fountain`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── PDF Print ──────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Send to Canvas ─────────────────────────────────────────────
  const handleSendToCanvas = () => {
    if (!storyboard) return;
    let x = 100;
    let y = 100;

    storyboard.acts?.forEach((act) => {
      act.scenes?.forEach((sc) => {
        // Create a Prompt node with scene description
        const promptId = addNode('promptNode', { x, y });
        // Create an Image node to the right
        const imageId = addNode('geminiImageNode', { x: x + 280, y });

        // Update the prompt node with scene text
        setTimeout(() => {
          const { updateNodeData, nodes } = useFlowStore.getState();
          const promptText = `${sc.intExt}. ${sc.location} — ${sc.timeOfDay}\n${sc.description || ''}`;
          updateNodeData(promptId, { text: promptText, label: `Scene ${sc.id}` });
        }, 50);

        y += 220;
        if (y > 2000) { y = 100; x += 700; }
      });
    });
  };

  // ── Import .gflow ──────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      importProject(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasStoryboard = !!storyboard;

  return (
    <div className="export-panel">
      <div className="export-section-title">Export & Save</div>

      {/* Project file */}
      <div className="export-group">
        <div className="export-group-label">Project File</div>
        <div className="export-btn-row">
          <button
            className="export-btn export-btn--primary"
            onClick={exportProject}
            title="Save project as .gflow file"
          >
            <Save size={13} /> Export .gflow
          </button>
          <label className="export-btn" title="Load a .gflow project file">
            <FolderOpen size={13} /> Import .gflow
            <input
              ref={importRef}
              type="file"
              accept=".gflow,.json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Storyboard exports */}
      <div className="export-group">
        <div className="export-group-label">Storyboard</div>
        <div className="export-btn-col">
          <button
            className="export-btn"
            onClick={handlePrint}
            disabled={!hasStoryboard}
            title="Print / Save as PDF"
          >
            <Printer size={13} /> PDF Storyboard
          </button>
          <button
            className="export-btn"
            onClick={handleExportCSV}
            disabled={!hasStoryboard}
            title="Export shot list as CSV"
          >
            <FileDown size={13} /> Shot List CSV
          </button>
          <button
            className="export-btn"
            onClick={handleExportFountain}
            disabled={!hasStoryboard}
            title="Export as Fountain screenplay"
          >
            <Film size={13} /> Fountain Script
          </button>
          <button
            className="export-btn export-btn--canvas"
            onClick={handleSendToCanvas}
            disabled={!hasStoryboard}
            title="Send all scenes to the canvas as nodes"
          >
            <ArrowUpRight size={13} /> Send to Canvas
          </button>
        </div>
      </div>

      {!hasStoryboard && (
        <p className="export-empty-note">Generate a storyboard first to enable exports.</p>
      )}
    </div>
  );
}
