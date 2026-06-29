create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.universities (
  university_id uuid primary key default gen_random_uuid(),
  university_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  branch_id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(university_id) on delete cascade,
  branch_name text not null,
  branch_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  subject_id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(university_id) on delete cascade,
  branch_id uuid not null references public.branches(branch_id) on delete cascade,
  semester integer not null check (semester between 1 and 12),
  subject_name text not null,
  subject_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists universities_name_unique
on public.universities (university_name);

create unique index if not exists branches_university_name_unique
on public.branches (university_id, branch_name);

create unique index if not exists subjects_academic_code_unique
on public.subjects (university_id, branch_id, semester, subject_code);

alter table public.admin_users enable row level security;
alter table public.universities enable row level security;
alter table public.branches enable row level security;
alter table public.subjects enable row level security;

create or replace function public.is_climbup_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "universities_authenticated_read" on public.universities;
create policy "universities_authenticated_read"
on public.universities
for select
to authenticated
using (true);

drop policy if exists "branches_authenticated_read" on public.branches;
create policy "branches_authenticated_read"
on public.branches
for select
to authenticated
using (true);

drop policy if exists "subjects_authenticated_read" on public.subjects;
create policy "subjects_authenticated_read"
on public.subjects
for select
to authenticated
using (true);

drop policy if exists "universities_admin_insert" on public.universities;
create policy "universities_admin_insert"
on public.universities
for insert
to authenticated
with check (public.is_climbup_admin());

drop policy if exists "universities_admin_update" on public.universities;
create policy "universities_admin_update"
on public.universities
for update
to authenticated
using (public.is_climbup_admin())
with check (public.is_climbup_admin());

drop policy if exists "branches_admin_insert" on public.branches;
create policy "branches_admin_insert"
on public.branches
for insert
to authenticated
with check (public.is_climbup_admin());

drop policy if exists "branches_admin_update" on public.branches;
create policy "branches_admin_update"
on public.branches
for update
to authenticated
using (public.is_climbup_admin())
with check (public.is_climbup_admin());

drop policy if exists "subjects_admin_insert" on public.subjects;
create policy "subjects_admin_insert"
on public.subjects
for insert
to authenticated
with check (public.is_climbup_admin());

drop policy if exists "subjects_admin_update" on public.subjects;
create policy "subjects_admin_update"
on public.subjects
for update
to authenticated
using (public.is_climbup_admin())
with check (public.is_climbup_admin());

-- Run this once with your admin auth user id.
-- insert into public.admin_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
