alter table public.insights enable row level security;

drop policy if exists "insights_public_read" on public.insights;
create policy "insights_public_read"
on public.insights
for select
using (true);

drop policy if exists "insights_owner_insert" on public.insights;
create policy "insights_owner_insert"
on public.insights
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "insights_owner_update" on public.insights;
create policy "insights_owner_update"
on public.insights
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "insights_owner_delete" on public.insights;
create policy "insights_owner_delete"
on public.insights
for delete
to authenticated
using (auth.uid() = user_id);
