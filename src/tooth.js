import './common.js';
import './style.css';
import * as THREE from 'three';
import { Viewer } from './viewer.js';
import { createInfoBox, displayName, setupLayersPanel, showHover } from './panels.js';
import { setupNotes } from './notes.js';
import { buildTooth } from './tooth-model.js';
import tooth from './data/tooth.json';
import { sources } from './data/structures.json';

const $ = (id) => document.getElementById(id);

const meshInfo = new Map(tooth.structures.map((s) => [s.id, { structure: s, side: null }]));
const showInfo = createInfoBox({ layers: tooth.layers, sources });
const viewer = new Viewer($('viewport'), { layers: tooth.layers, meshInfo, onSelect: showInfo, onHover: showHover });
viewer.setModel(buildTooth(), { solidCut: true });
$('info-close').addEventListener('click', () => viewer.select(null));
$('reset-view').addEventListener('click', () => viewer.resetView());
setupNotes(viewer, {
  page: 'tooth',
  displayName: (meshName) => (meshInfo.has(meshName) ? displayName(meshInfo.get(meshName)) : null),
});
setupLayersPanel(viewer, tooth.layers);

// Cut-away view: hide the half of the model facing the default camera so the layers show.
const cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const setCut = (on) => {
  viewer.setClipPlane(on ? cut : null);
  $('cut-view').setAttribute('aria-pressed', String(on));
  $('cut-view').textContent = on ? 'Whole tooth' : 'Cut in half';
};
$('cut-view').addEventListener('click', () => setCut($('cut-view').getAttribute('aria-pressed') !== 'true'));
setCut(true);

if (import.meta.env.DEV) window.__viewer = viewer;
