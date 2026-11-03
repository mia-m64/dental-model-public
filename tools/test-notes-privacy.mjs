// Checks that students can only see and change their own notes.
// Run against the LOCAL Supabase only: supabase start, then npm run test:notes
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }));
const url = status.API_URL, key = status.PUBLISHABLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error('Only run this against the local Supabase');
const mk = () => createClient(url, key, { auth: { persistSession: false } });
const pw = 'testpass123';
async function user(email) {
  const c = mk();
  let r = await c.auth.signUp({ email, password: pw });
  if (r.error) r = await c.auth.signInWithPassword({ email, password: pw });
  if (r.error) throw r.error;
  return c;
}
const ok = (cond, msg) => console.log(cond ? 'PASS' : 'FAIL', msg);
const a = await user(`alice.${Date.now()}@test.local`);
const b = await user(`bob.${Date.now()}@test.local`);
const anon = mk();

const ins = await a.from('notes').insert({ x: 0, y: 1.5, z: 0.05, structure_id: 'tooth_19', body: 'Alice private' }).select().single();
ok(!ins.error, 'Alice can create a note ' + (ins.error?.message ?? ''));
const id = ins.data.id;

const bRead = await b.from('notes').select('*');
ok(!bRead.error && bRead.data.length === 0, 'Bob sees none of Alice notes');
const bUpd = await b.from('notes').update({ body: 'hacked' }).eq('id', id).select();
ok(bUpd.data?.length === 0, 'Bob cannot edit Alice note');
const bDel = await b.from('notes').delete().eq('id', id).select();
ok(bDel.data?.length === 0, 'Bob cannot delete Alice note');
const bSpoof = await b.from('notes').insert({ x: 0, y: 0, z: 0, user_id: ins.data.user_id, body: 'spoof' });
ok(!!bSpoof.error, 'Bob cannot create a note as Alice');
const anonRead = await anon.from('notes').select('*');
ok(!!anonRead.error || anonRead.data.length === 0, 'Signed-out visitor sees nothing');
const steal = await a.from('notes').update({ user_id: (await b.auth.getUser()).data.user.id }).eq('id', id).select().single();
ok(steal.data?.user_id === ins.data.user_id, 'Owner cannot be changed');
const long = await a.from('notes').insert({ x: 0, y: 0, z: 0, body: 'x'.repeat(2001) });
ok(!!long.error, 'Notes over 2000 chars rejected');
const bad = await a.from('notes').insert({ x: 0, y: 0, z: 0, structure_id: "<script>" });
ok(!!bad.error, 'Invalid structure id rejected');
const badPage = await a.from('notes').insert({ x: 0, y: 0, z: 0, page: 'learn' });
ok(!!badPage.error, 'Unknown page rejected');
const tooth = await a.from('notes').insert({ x: 0, y: 0, z: 0, page: 'tooth', body: 'Tooth note' }).select().single();
const headOnly = await a.from('notes').select('body').eq('page', 'head');
ok(!tooth.error && headOnly.data.length === 1 && ins.data.page === 'head', 'Notes keep their page (default head)');
await a.from('notes').delete().eq('id', tooth.data?.id);
const aRead = await a.from('notes').select('body');
ok(aRead.data.length === 1 && aRead.data[0].body === 'Alice private', 'Alice still sees her note unchanged');

// Highlights on Learn
const mark = { topic: 'infection-control', block: '0-1', start_offset: 0, end_offset: 5, quote: 'Clean' };
const hIns = await a.from('highlights').insert(mark).select().single();
ok(!hIns.error, 'Alice can highlight ' + (hIns.error?.message ?? ''));
const hBRead = await b.from('highlights').select('*');
ok(!hBRead.error && hBRead.data.length === 0, 'Bob sees none of Alice highlights');
const hBDel = await b.from('highlights').delete().eq('id', hIns.data?.id).select();
ok(hBDel.data?.length === 0, 'Bob cannot delete Alice highlight');
const hSpoof = await b.from('highlights').insert({ ...mark, user_id: hIns.data?.user_id });
ok(!!hSpoof.error, 'Bob cannot highlight as Alice');
const hAnon = await anon.from('highlights').select('*');
ok(!!hAnon.error || hAnon.data.length === 0, 'Signed-out visitor sees no highlights');
const hEdit = await a.from('highlights').update({ quote: 'x' }).eq('id', hIns.data?.id).select();
ok(!!hEdit.error, 'Highlights cannot be edited');
const hBadBlock = await a.from('highlights').insert({ ...mark, block: '<b>' });
ok(!!hBadBlock.error, 'Invalid block rejected');
const hBadRange = await a.from('highlights').insert({ ...mark, start_offset: 5, end_offset: 5 });
ok(!!hBadRange.error, 'Empty range rejected');
const hLong = await a.from('highlights').insert({ ...mark, quote: 'x'.repeat(2001) });
ok(!!hLong.error, 'Highlights over 2000 chars rejected');
const hDel = await a.from('highlights').delete().eq('id', hIns.data?.id).select();
ok(hDel.data?.length === 1, 'Alice can remove her highlight');
