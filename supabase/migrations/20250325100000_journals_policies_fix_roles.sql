-- If you already applied the first journals migration with "TO authenticated", run this
-- so list/detail queries work with PostgREST + anon key + user JWT.

drop policy if exists "journals_select_own" on public.journals;
drop policy if exists "journals_insert_own" on public.journals;
drop policy if exists "journals_update_own" on public.journals;
drop policy if exists "journals_delete_own" on public.journals;

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
