-- Notes can now be placed on three 3D pages. Each note remembers its page so it only
-- shows there. Existing notes were all made on the head model.
-- Row-level security (enabled in 20261023000000_notes.sql) applies to the new column too.

alter table public.notes
  add column page text not null default 'head'
  check (page in ('head', 'tooth', 'scan'));

alter table public.notes enable row level security;

drop index if exists public.notes_user_id_idx;
create index notes_user_id_page_idx on public.notes (user_id, page);
