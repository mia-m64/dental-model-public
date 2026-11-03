import './common.js';
import './learn.css';
import './sources.css';
import anatomy from './data/structures.json';
import tooth from './data/tooth.json';
import learn from './data/learn.json';
import credits from './data/credits.json';

// Lists every source the app uses, built from the data files so it can't fall out of date.

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** One source: linked title, license, what it's used for, and optionally the items that cite it. */
function sourceItem({ title, url, license }, use, usedBy = []) {
  const li = el('li', 'source');
  const heading = el('p', 'source-title');
  if (url?.startsWith('https://')) {
    const a = el('a', null, title);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    heading.append(a);
  } else {
    heading.textContent = title;
  }
  li.append(heading, el('p', 'license', license));
  if (use) li.append(el('p', 'source-use', use));
  if (usedBy.length) {
    const details = el('details');
    details.append(el('summary', null, `Cited by ${usedBy.length} ${usedBy.length === 1 ? 'item' : 'items'}`));
    details.append(el('p', 'source-used-by', usedBy.join(' · ')));
    li.append(details);
  }
  return li;
}

/** Sources keyed by id, plus the names of the entries that cite each one. */
function citedSources(sources, entries, label) {
  const usedBy = new Map();
  for (const entry of entries) {
    for (const key of entry.sources) {
      if (!usedBy.has(key)) usedBy.set(key, []);
      usedBy.get(key).push(label(entry));
    }
  }
  return [...usedBy.keys()].filter((key) => sources[key]).map((key) => [sources[key], usedBy.get(key)]);
}

const groups = [
  {
    id: 'anatomy',
    title: 'Anatomy definitions',
    note: 'Definitions shown when you click a structure on the 3D Model and Inside a Tooth pages.',
    items: citedSources(
      anatomy.sources,
      [
        ...anatomy.structures,
        ...tooth.structures.map((s) => ({ ...s, name: `${s.name} (Inside a Tooth)` })),
      ],
      (s) => s.name,
    ),
  },
  {
    id: 'learn',
    title: 'Learn topics',
    note: 'Each topic also lists its own sources and the date they were checked.',
    items: citedSources(learn.sources, learn.topics, (t) => t.title),
  },
  ...credits.groups.map((g, i) => ({
    id: `credits-${i}`,
    title: g.title,
    items: g.items.map((item) => [item, [], item.use]),
  })),
];

for (const group of groups) {
  const section = el('section', 'source-group');
  section.id = group.id;
  section.append(el('h2', null, group.title));
  if (group.note) section.append(el('p', 'group-note', group.note));
  const list = el('ul', 'source-list');
  // Sort text sources by title so OpenStax, CDC, OSHA, StatPearls... are easy to scan.
  const items = group.id.startsWith('credits') ? group.items : [...group.items].sort((a, b) => a[0].title.localeCompare(b[0].title));
  for (const [src, usedBy, use] of items) list.append(sourceItem(src, use, usedBy));
  section.append(list);
  $('source-groups').append(section);

  const a = el('a', null, group.title);
  a.href = `#${group.id}`;
  const li = el('li');
  li.append(a);
  $('section-list').append(li);
}
