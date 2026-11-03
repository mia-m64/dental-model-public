// Checks src/data/structures.json (every structure has a known layer, a summary and
// at least one source; ids are unique) and src/data/learn.json (every topic says what
// it's for, where it applies and where it comes from) and src/data/tooth.json (same
// rules as structures, using the sources in structures.json). All source links must be https.
// Run: node tools/validate.js
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/data/structures.json', import.meta.url), 'utf8'));
const errors = [];
const layers = new Set(data.layers.map((l) => l.id));
const ids = new Set();

for (const [key, src] of Object.entries(data.sources)) {
  if (!src.url?.startsWith('https://')) errors.push(`source "${key}": url must be https`);
  if (!src.license) errors.push(`source "${key}": missing license`);
}

for (const s of data.structures) {
  const where = `structure "${s.id}"`;
  if (ids.has(s.id)) errors.push(`${where}: duplicate id`);
  ids.add(s.id);
  if (!/^[a-z0-9_]+$/.test(s.id)) errors.push(`${where}: id must be lowercase letters, digits, _`);
  if (!layers.has(s.layer)) errors.push(`${where}: unknown layer "${s.layer}"`);
  if (!s.name || !s.summary || !s.blender) errors.push(`${where}: needs name, summary and blender`);
  if (!s.sources?.length) errors.push(`${where}: needs at least one source`);
  for (const key of s.sources ?? []) if (!data.sources[key]) errors.push(`${where}: unknown source "${key}"`);
}

// Detail views (tooth.json): same rules as structures, using structures.json sources.
const views = ['tooth'].map((name) => [
  name,
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8')),
]);
for (const [name, view] of views) {
  const viewLayers = new Set(view.layers.map((l) => l.id));
  const viewIds = new Set();
  for (const s of view.structures) {
    const where = `${name} structure "${s.id}"`;
    if (viewIds.has(s.id)) errors.push(`${where}: duplicate id`);
    viewIds.add(s.id);
    if (!viewLayers.has(s.layer)) errors.push(`${where}: unknown layer "${s.layer}"`);
    if (!s.name || !s.summary) errors.push(`${where}: needs name and summary`);
    if (!s.sources?.length) errors.push(`${where}: needs at least one source`);
    for (const key of s.sources ?? []) if (!data.sources[key]) errors.push(`${where}: unknown source "${key}"`);
  }
}

const learn = JSON.parse(readFileSync(new URL('../src/data/learn.json', import.meta.url), 'utf8'));
for (const [key, src] of Object.entries(learn.sources)) {
  if (!src.url?.startsWith('https://')) errors.push(`learn source "${key}": url must be https`);
  if (!src.license) errors.push(`learn source "${key}": missing license`);
}
for (const t of learn.topics) {
  const where = `learn topic "${t.id}"`;
  for (const field of ['title', 'purpose', 'appliesTo', 'appliesNote', 'checked']) {
    if (!t[field]) errors.push(`${where}: missing ${field}`);
  }
  if (!t.sources?.length) errors.push(`${where}: needs at least one source`);
  for (const key of t.sources ?? []) if (!learn.sources[key]) errors.push(`${where}: unknown source "${key}"`);
  if (!t.sections?.length) errors.push(`${where}: needs sections`);
}

if (errors.length) {
  console.error(`Content data has ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`structures.json OK: ${data.structures.length} structures, ${Object.keys(data.sources).length} sources`);
for (const [name, view] of views) console.log(`${name}.json OK: ${view.structures.length} structures`);
console.log(`learn.json OK: ${learn.topics.length} topic(s), ${Object.keys(learn.sources).length} sources`);
