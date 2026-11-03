import './common.js';
import './style.css';
import { Viewer } from './viewer.js';
import { setupNotes } from './notes.js';
import { createInfoBox, displayName, setupLayersPanel, showHover } from './panels.js';
import data from './data/structures.json';

const $ = (id) => document.getElementById(id);

// Mesh names in head.glb: "<id>" or "<id>_L" / "<id>_R" for paired structures.
const meshInfo = new Map();
for (const s of data.structures) {
  if (s.bilateral) {
    meshInfo.set(`${s.id}_L`, { structure: s, side: 'Left' });
    meshInfo.set(`${s.id}_R`, { structure: s, side: 'Right' });
  } else {
    meshInfo.set(s.id, { structure: s, side: null });
  }
}

const showInfo = createInfoBox(data);
const viewer = new Viewer($('viewport'), { layers: data.layers, meshInfo, onSelect: showInfo, onHover: showHover });
$('info-close').addEventListener('click', () => viewer.select(null));
$('reset-view').addEventListener('click', () => viewer.resetView());

setupLayersPanel(viewer, data.layers);

// Sign-in and private notes (shared with the other 3D pages).
setupNotes(viewer, {
  page: 'head',
  displayName: (meshName) => (meshInfo.has(meshName) ? displayName(meshInfo.get(meshName)) : null),
});

viewer
  .load(`${import.meta.env.BASE_URL}models/head.glb`)
  .then(() => $('loading').remove())
  .catch((err) => {
    console.error(err);
    $('loading').textContent = 'Could not load the 3D model.';
  });

// Dev-only handle for debugging in the console; removed from production builds.
if (import.meta.env.DEV) window.__viewer = viewer;
