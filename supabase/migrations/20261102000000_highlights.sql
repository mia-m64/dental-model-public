-- Private highlights on Learn: each student can only see and change their own.

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Learn topic id from src/data/learn.json, e.g. infection-control.
  topic text not null check (topic ~ '^[a-z0-9-]{1,64}$'),
  -- Paragraph or list item inside the topic, e.g. 2-i (section 2 intro) or 2-5 (section 2, point 5).
  block text not null check (block ~ '^[0-9]{1,3}-(i|[0-9]{1,3})$'),
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null,
  -- The highlighted words, so a highlight can be found again if the topic text moves.
  quote text not null check (char_length(quote) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (end_offset > start_offset)
);

create index highlights_user_id_topic_idx on public.highlights (user_id, topic);

alter table public.highlights enable row level security;

-- Only signed-in users, and only their own rows. Highlights are never edited.
revoke all on public.highlights from anon;
revoke all on public.highlights from authenticated;
grant select, insert, delete on public.highlights to authenticated;

create policy "Read own highlights" on public.highlights
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Create own highlights" on public.highlights
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Delete own highlights" on public.highlights
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Limit how many highlights one account can create (stops accidental or abusive floods).
create function public.highlights_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.highlights where user_id = new.user_id) >= 2000 then
    raise exception 'Highlight limit reached (2000)';
  end if;
  return new;
end;
$$;

create trigger highlights_limit before insert on public.highlights
  for each row execute function public.highlights_limit();
