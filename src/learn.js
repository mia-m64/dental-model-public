import './common.js';
import './learn.css';
import data from './data/learn.json';
import { Highlights } from './highlights.js';

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function showTopic(id) {
  const topic = data.topics.find((t) => t.id === id) ?? data.topics[0];

  for (const link of document.querySelectorAll('#topic-list a')) {
    link.toggleAttribute('aria-current', link.dataset.id === topic.id);
  }

  document.title = `${topic.title} · Learn · Dental Anatomy 3D`;
  $('topic-title').textContent = topic.title;
  $('topic-for').textContent = topic.purpose;
  $('topic-applies').textContent = topic.appliesTo + '.';
  $('topic-applies-note').textContent = topic.appliesNote;
  $('topic-checked').textContent = topic.checked;

  const sources = $('topic-sources');
  sources.replaceChildren();
  for (const key of topic.sources) {
    const src = data.sources[key];
    if (!src || !src.url.startsWith('https://')) continue;
    const a = el('a', null, src.title);
    a.href = src.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const li = el('li');
    li.append(a, el('span', 'license', ` (${src.license})`));
    sources.append(li);
  }

  const sections = $('topic-sections');
  sections.replaceChildren();
  // data-hl names each paragraph so highlights can find it again.
  const highlightable = (tag, text, key) => {
    const node = el(tag, null, text);
    node.dataset.hl = key;
    return node;
  };
  for (const [i, section] of topic.sections.entries()) {
    const block = el('section', 'topic-section');
    block.append(el('h2', null, section.heading));
    if (section.intro) block.append(highlightable('p', section.intro, `${i}-i`));
    const list = el('ul');
    for (const [j, point] of section.points.entries()) list.append(highlightable('li', point, `${i}-${j}`));
    block.append(list);
    sections.append(block);
  }
  highlights.show(topic.id);
  window.scrollTo(0, 0);
}

const highlights = new Highlights($('topic-sections'));

// Topic tabs (current topics + greyed-out upcoming ones).
const list = $('topic-list');
for (const topic of data.topics) {
  const a = el('a', null, topic.title);
  a.href = `#${topic.id}`;
  a.dataset.id = topic.id;
  const li = el('li');
  li.append(a);
  list.append(li);
}
for (const title of data.upcoming) {
  const li = el('li', 'upcoming');
  li.append(el('span', null, title), el('small', null, 'Coming soon'));
  list.append(li);
}

window.addEventListener('hashchange', () => showTopic(location.hash.slice(1)));
showTopic(location.hash.slice(1));
