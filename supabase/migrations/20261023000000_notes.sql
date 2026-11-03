-- Private sticky notes: each student can only see and change their own notes.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Mesh the note was placed on, e.g. tooth_19 or n_lingual_R.
  structure_id text check (structure_id ~ '^[A-Za-z0-9_]{1,64}$'),
  -- Anchor point on the 3D model, in model coordinates (meters).
  x double precision not null check (abs(x) < 10),
  y double precision not null check (abs(y) < 10),
  z double precision not null check (abs(z) < 10),
  body text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);

alter table public.notes enable row level security;

-- Only signed-in users, and only their own rows.
revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

create policy "Read own notes" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Create own notes" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Edit own notes" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Delete own notes" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- A student can't move a note to someone else or fake timestamps.
create function public.notes_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger notes_touch before update on public.notes
  for each row execute function public.notes_touch();

-- Limit how many notes one account can create (stops accidental or abusive floods).
create function public.notes_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.notes where user_id = new.user_id) >= 500 then
    raise exception 'Note limit reached (500)';
  end if;
  return new;
end;
$$;

create trigger notes_limit before insert on public.notes
  for each row execute function public.notes_limit();
