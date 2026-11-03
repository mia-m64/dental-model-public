import { supabase } from './supabase.js';
import { setupAuth } from './auth.js';

const $ = (id) => document.getElementById(id);

/**
 * Private highlights on the Learn text. Each one is stored in the `highlights`
 * table; row-level security makes every student see only their own. A selection
 * across several paragraphs becomes one row per paragraph ([data-hl] element).
 */
export class Highlights {
  constructor(root) {
    this.root = root;
    this.button = $('highlight-action');
    this.topic = null;
    this.user = null;
    this.rows = [];
    this.pending = null; // selection waiting for the student to sign in
    this.action = null;
    this.auth = setupAuth((user) => this._onUser(user));
    if (!this.auth.available) return;

    $('sign-in').addEventListener('click', () => (this.pending = null));
    this.button.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection
    this.button.addEventListener('click', () => this.action?.());
    document.addEventListener('mouseup', (e) => this._onMouseUp(e));
    window.addEventListener('scroll', () => this._hideButton(), { passive: true });
  }

  /** Call after the topic's text is on the page. */
  show(topic) {
    this.topic = topic;
    this._hideButton();
    this._paint();
  }

  async _onUser(user) {
    this.user = user;
    this.rows = [];
    if (user) {
      const { data, error } = await supabase.from('highlights').select('*').order('created_at');
      if (error) console.error(error);
      else this.rows = data;
    }
    this._paint();
    if (user && this.pending) {
      const parts = this.pending;
      this.pending = null;
      this._add(parts);
    }
  }

  _onMouseUp(e) {
    if (e.target === this.button) return;
    const selection = getSelection();
    if (!selection.isCollapsed && selection.rangeCount) {
      const range = selection.getRangeAt(0);
      const parts = this._parts(range);
      if (parts.length) this._showButton(range.getBoundingClientRect(), 'Highlight', () => this._add(parts));
      else this._hideButton();
      return;
    }
    const mark = e.target.closest?.('mark[data-ids]');
    if (mark && this.root.contains(mark)) {
      this._showButton(mark.getBoundingClientRect(), 'Remove highlight', () => this._remove(mark.dataset.ids.split(' ')));
    } else {
      this._hideButton();
    }
  }

  /** Turns a selection into { topic, block, start_offset, end_offset, quote } rows. */
  _parts(range) {
    const parts = [];
    for (const block of this.root.querySelectorAll('[data-hl]')) {
      if (!range.intersectsNode(block)) continue;
      const text = block.textContent;
      const offsetOf = (node, offset) => {
        const before = document.createRange();
        before.selectNodeContents(block);
        before.setEnd(node, offset);
        return before.toString().length;
      };
      const start = block.contains(range.startContainer) ? offsetOf(range.startContainer, range.startOffset) : 0;
      const end = block.contains(range.endContainer) ? offsetOf(range.endContainer, range.endOffset) : text.length;
      const quote = text.slice(start, end);
      if (quote.trim()) parts.push({ topic: this.topic, block: block.dataset.hl, start_offset: start, end_offset: end, quote });
    }
    return parts;
  }

  async _add(parts) {
    if (!this.user) {
      this.pending = parts;
      this._hideButton();
      this.auth.open();
      return;
    }
    const { data, error } = await supabase.from('highlights').insert(parts).select();
    if (error) {
      console.error(error);
      this.button.textContent = 'Could not save';
      return;
    }
    this.rows.push(...data);
    getSelection().removeAllRanges();
    this._hideButton();
    this._paint();
  }

  async _remove(ids) {
    const { error } = await supabase.from('highlights').delete().in('id', ids);
    if (error) {
      console.error(error);
      this.button.textContent = 'Could not remove';
      return;
    }
    this.rows = this.rows.filter((row) => !ids.includes(row.id));
    this._hideButton();
    this._paint();
  }

  /** Redraws every paragraph from plain text, with <mark>s where highlights are. */
  _paint() {
    const blocks = [...this.root.querySelectorAll('[data-hl]')];
    const ranges = new Map(blocks.map((b) => [b, []]));
    for (const row of this.rows) {
      if (row.topic !== this.topic) continue;
      const found = this._locate(row, blocks);
      if (found) ranges.get(found.block).push(found);
    }
    for (const block of blocks) this._paintBlock(block, ranges.get(block));
  }

  /** Finds a highlight where it was saved or, if the topic text moved, by its words. */
  _locate(row, blocks) {
    const saved = blocks.find((b) => b.dataset.hl === row.block);
    if (saved?.textContent.slice(row.start_offset, row.end_offset) === row.quote) {
      return { block: saved, id: row.id, start: row.start_offset, end: row.end_offset };
    }
    for (const block of blocks) {
      const start = block.textContent.indexOf(row.quote);
      if (start >= 0) return { block, id: row.id, start, end: start + row.quote.length };
    }
    return null;
  }

  _paintBlock(block, ranges) {
    const text = block.textContent;
    const cuts = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
    const pieces = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const piece = text.slice(cuts[i], cuts[i + 1]);
      const hits = ranges.filter((r) => r.start <= cuts[i] && r.end >= cuts[i + 1]);
      if (!hits.length) {
        pieces.push(document.createTextNode(piece));
        continue;
      }
      const mark = document.createElement('mark');
      mark.textContent = piece;
      mark.dataset.ids = hits.map((r) => r.id).join(' ');
      pieces.push(mark);
    }
    block.replaceChildren(...pieces);
  }

  _showButton(rect, label, action) {
    this.action = action;
    this.button.textContent = label;
    this.button.hidden = false;
    const left = rect.left + rect.width / 2 - this.button.offsetWidth / 2;
    this.button.style.left = `${Math.max(8, left)}px`;
    this.button.style.top = `${Math.max(76, rect.top - 42)}px`;
  }

  _hideButton() {
    this.button.hidden = true;
    this.action = null;
  }
}
