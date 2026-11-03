import { supabase } from './supabase.js';
import { setupAuth } from './auth.js';

const SAVE_DELAY_MS = 600;
const MAX_LENGTH = 2000;

/**
 * Sticky notes pinned to points on the 3D model. Each note is stored in the
 * `notes` table; row-level security makes every student see only their own.
 */
export class Notes {
  constructor(viewer, layer, { page, displayName }) {
    this.viewer = viewer;
    this.layer = layer; // absolutely positioned container over the canvas
    this.page = page; // 'head' | 'tooth': notes only show on the page they were made on
    this.displayName = displayName; // (meshName) => label or null
    this.notes = new Map(); // id -> { row, el }
    this.visible = true;
    this.loadRequest = 0;
    viewer.onFrame(() => this._position());
  }

  async load() {
    const request = ++this.loadRequest;
    const { data, error } = await supabase.from('notes').select('*').eq('page', this.page).order('created_at');
    if (request !== this.loadRequest) return; // a newer load or sign-out happened meanwhile
    this.clear();
    if (error) {
      console.error(error);
      return;
    }
    for (const row of data) this._render(row);
  }

  clear() {
    this.loadRequest++;
    for (const { el } of this.notes.values()) el.remove();
    this.notes.clear();
  }

  setVisible(visible) {
    this.visible = visible;
    this.layer.hidden = !visible;
  }

  /** Waits for a click on the model, then creates a note there. */
  startPlacing(onDone) {
    this.viewer.setPlaceMode(async (point, meshName) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({ page: this.page, x: point.x, y: point.y, z: point.z, structure_id: meshName })
        .select()
        .single();
      onDone();
      if (error) {
        console.error(error);
        return;
      }
      const note = this._render(data);
      note.el.classList.add('open');
      note.el.querySelector('textarea').focus();
    });
  }

  cancelPlacing() {
    this.viewer.setPlaceMode(null);
  }

  _render(row) {
    const el = document.createElement('div');
    el.className = 'note';

    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'note-pin';
    pin.title = 'Open or close note';

    const card = document.createElement('div');
    card.className = 'note-card';
    const header = document.createElement('div');
    header.className = 'note-header';
    const label = document.createElement('span');
    label.className = 'note-label';
    label.textContent = this.displayName(row.structure_id) ?? 'Note';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'note-delete';
    del.textContent = 'Delete';
    header.append(label, del);

    const text = document.createElement('textarea');
    text.maxLength = MAX_LENGTH;
    text.placeholder = 'Write your note…';
    text.value = row.body;
    card.append(header, text);
    el.append(pin, card);
    this.layer.append(el);

    const note = { row, el };
    this.notes.set(row.id, note);

    pin.addEventListener('click', () => el.classList.toggle('open'));

    let timer = null;
    text.addEventListener('input', () => {
      clearTimeout(timer);
      el.classList.add('saving');
      timer = setTimeout(async () => {
        const { error } = await supabase.from('notes').update({ body: text.value }).eq('id', row.id);
        el.classList.toggle('error', !!error);
        el.classList.remove('saving');
      }, SAVE_DELAY_MS);
    });

    // Two-step delete instead of a browser confirm() dialog.
    del.addEventListener('click', async () => {
      if (!del.classList.contains('confirm')) {
        del.classList.add('confirm');
        del.textContent = 'Really delete?';
        setTimeout(() => {
          del.classList.remove('confirm');
          del.textContent = 'Delete';
        }, 3000);
        return;
      }
      const { error } = await supabase.from('notes').delete().eq('id', row.id);
      if (error) {
        console.error(error);
        return;
      }
      el.remove();
      this.notes.delete(row.id);
    });
    return note;
  }

  _position() {
    if (!this.visible) return;
    for (const { row, el } of this.notes.values()) {
      const p = this.viewer.toScreen(row.x, row.y, row.z);
      el.hidden = !p;
      if (p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  }
}

/**
 * Wires the toolbar on a 3D page: "Sign in", "+ Add Note" (click it, then click the
 * model), "Hide/Show notes", Esc to cancel. Expects the elements from the page HTML.
 */
export function setupNotes(viewer, { page, displayName }) {
  const $ = (id) => document.getElementById(id);
  const notes = new Notes(viewer, $('notes-layer'), { page, displayName });
  let currentUser = null;

  const stopPlacing = () => {
    notes.cancelPlacing();
    $('add-note').classList.remove('active');
    $('place-hint').hidden = true;
  };

  const auth = setupAuth(async (user) => {
    currentUser = user;
    stopPlacing();
    $('toggle-notes').hidden = !user;
    if (user) await notes.load();
    else notes.clear();
  });

  if (!auth.available) $('add-note').title = 'Notes are not set up yet';
  $('add-note').addEventListener('click', () => {
    if (!auth.available) return;
    if (!currentUser) {
      auth.open();
      return;
    }
    if ($('add-note').classList.contains('active')) {
      stopPlacing();
      return;
    }
    viewer.select(null);
    notes.setVisible(true);
    $('toggle-notes').textContent = 'Hide notes';
    $('add-note').classList.add('active');
    $('place-hint').hidden = false;
    notes.startPlacing(stopPlacing);
  });
  $('place-cancel').addEventListener('click', stopPlacing);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') stopPlacing();
  });
  $('toggle-notes').addEventListener('click', () => {
    notes.setVisible(!notes.visible);
    $('toggle-notes').textContent = notes.visible ? 'Hide notes' : 'Show notes';
  });
  return notes;
}
