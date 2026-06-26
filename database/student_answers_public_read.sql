alter table public.student_answers enable row level security;

drop policy if exists "student_answers_public_read_published" on public.student_answers;
create policy "student_answers_public_read_published"
on public.student_answers
for select
using (
  status = 'published'
  or auth.uid() = user_id
);

drop policy if exists "student_answers_owner_insert" on public.student_answers;
create policy "student_answers_owner_insert"
on public.student_answers
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "student_answers_owner_update" on public.student_answers;
create policy "student_answers_owner_update"
on public.student_answers
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "student_answers_owner_delete" on public.student_answers;
create policy "student_answers_owner_delete"
on public.student_answers
for delete
to authenticated
using (auth.uid() = user_id);
