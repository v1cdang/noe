-- Journals: full-text entries linked to users (Journal History feature).
-- Apply in Supabase SQL editor or via supabase db push.

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null default '',
  prompt text not null default '',
  mood text null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journals_user_id_created_at_desc_idx
  on public.journals (user_id, created_at desc);

create or replace function public.set_journals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_journals_updated_at on public.journals;
create trigger set_journals_updated_at
  before update on public.journals
  for each row
  execute procedure public.set_journals_updated_at();

alter table public.journals enable row level security;

drop policy if exists "journals_select_own" on public.journals;
drop policy if exists "journals_insert_own" on public.journals;
drop policy if exists "journals_update_own" on public.journals;
drop policy if exists "journals_delete_own" on public.journals;

-- No "TO authenticated": PostgREST uses the anon key with a user JWT; policies must apply
-- to that session. auth.uid() still restricts rows to the signed-in user.
create policy "journals_select_own"
  on public.journals
  for select
  using (auth.uid() = user_id);

create policy "journals_insert_own"
  on public.journals
  for insert
  with check (auth.uid() = user_id);

create policy "journals_update_own"
  on public.journals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "journals_delete_own"
  on public.journals
  for delete
  using (auth.uid() = user_id);
