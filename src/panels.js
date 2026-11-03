// UI shared by the 3D pages (head model and tooth): the definition box, the hover
// label and the sliding layers panel. All text is written with textContent.

const $ = (id) => document.getElementById(id);

export const displayName = ({ structure, side }) => (side ? `${structure.name} (${side.toLowerCase()})` : structure.name);

/** Returns show(info) for the definitions box; info is { structure, side } or null. */
export function createInfoBox({ layers, sources }) {
  const layerNames = Object.fromEntries(layers.map((l) => [l.id, l.name]));
  return function showInfo(info) {
    const box = $('info-box');
    if (!info) {
      box.hidden = true;
      return;
    }
    const s = info.structure;
    $('info-layer').textContent = layerNames[s.layer];
    $('info-name').textContent = displayName(info);
    $('info-summary').textContent = s.summary;
    $('info-assistant-wrap').hidden = !s.assistant;
    $('info-assistant').textContent = s.assistant ?? '';
    // Paths not in the source 3D data, drawn for this app (see tools/export_head.py).
    const note = $('info-note');
    if (note) {
      note.hidden = !s.traced;
      note.textContent = s.traced ? `Approximate path drawn for this app. ${s.traced}` : '';
    }

    const list = $('info-sources');
    list.replaceChildren();
    for (const key of s.sources) {
      const src = sources[key];
      if (!src || !src.url.startsWith('https://')) continue;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = src.url;
      a.textContent = src.title;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const lic = document.createElement('span');
      lic.className = 'license';
      lic.textContent = ` (${src.license})`;
      li.append(a, lic);
      list.append(li);
    }
    box.hidden = false;
  };
}

export function showHover(info, x, y) {
  const label = $('hover-label');
  if (!info) {
    label.hidden = true;
    return;
  }
  label.textContent = displayName(info);
  label.style.left = `${x + 14}px`;
  label.style.top = `${y + 14}px`;
  label.hidden = false;
}

/** Builds one row per layer (show/hide, "Only", opacity) and wires the panel's tab and buttons. */
export function setupLayersPanel(viewer, layers) {
  const rows = new Map();
  let soloLayer = null;

  function setVisible(layerId, visible) {
    const row = rows.get(layerId);
    row.checkbox.checked = visible;
    row.li.classList.toggle('off', !visible);
    viewer.setLayerVisible(layerId, visible);
  }

  function setSolo(layerId) {
    soloLayer = soloLayer === layerId ? null : layerId;
    for (const [id, row] of rows) {
      setVisible(id, soloLayer === null || id === soloLayer);
      row.solo.classList.toggle('active', id === soloLayer);
    }
  }

  for (const layer of layers) {
    const li = document.createElement('li');
    li.className = 'layer';

    const row = document.createElement('div');
    row.className = 'layer-row';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = layer.color;
    label.append(checkbox, swatch, document.createTextNode(layer.name));
    const solo = document.createElement('button');
    solo.type = 'button';
    solo.className = 'solo';
    solo.textContent = 'Only';
    solo.title = `Show only ${layer.name.toLowerCase()}`;
    row.append(label, solo);

    const opacityRow = document.createElement('div');
    opacityRow.className = 'opacity-row';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '100';
    slider.setAttribute('aria-label', `${layer.name} opacity`);
    const value = document.createElement('span');
    value.className = 'opacity-value';
    value.textContent = '100%';
    opacityRow.append(document.createTextNode('Opacity'), slider, value);

    li.append(row, opacityRow);
    $('layer-list').append(li);
    rows.set(layer.id, { li, checkbox, solo });

    checkbox.addEventListener('change', () => {
      soloLayer = null;
      for (const r of rows.values()) r.solo.classList.remove('active');
      setVisible(layer.id, checkbox.checked);
    });
    solo.addEventListener('click', () => setSolo(layer.id));
    slider.addEventListener('input', () => {
      value.textContent = `${slider.value}%`;
      viewer.setLayerOpacity(layer.id, Number(slider.value) / 100);
    });
  }

  // Layers tab: click the header to slide the panel open or closed.
  const panel = $('layers-panel');
  const setPanelOpen = (open) => {
    panel.classList.toggle('open', open);
    $('layers-toggle').setAttribute('aria-expanded', String(open));
    try {
      localStorage.setItem('layersOpen', open ? '1' : '0');
    } catch {}
  };
  try {
    if (localStorage.getItem('layersOpen') === '0') setPanelOpen(false);
  } catch {}
  $('layers-toggle').addEventListener('click', () => setPanelOpen(!panel.classList.contains('open')));

  $('show-all').addEventListener('click', () => {
    soloLayer = null;
    for (const [id, row] of rows) {
      row.solo.classList.remove('active');
      setVisible(id, true);
    }
  });
}
