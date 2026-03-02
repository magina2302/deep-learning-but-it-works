-- Supabase schema: tables + relationships + secure RLS
-- Run this in Supabase SQL Editor (project owner role)

create extension if not exists pgcrypto;

-- 1) Core profile table (1:1 with auth.users)
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Topics / modules owned by student
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  -- Canonical external key for module linkage
  module_id uuid not null default gen_random_uuid() unique,
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  subtitle text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_student_name_unique unique (student_id, name)
);

-- 3) Subtopics under topics
create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  name text not null,
  mastery integer not null default 0 check (mastery between 0 and 100),
  mistake_count integer not null default 0 check (mistake_count >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  completed boolean not null default false,
  forgetting_risk text not null default 'low' check (forgetting_risk in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subtopics_module_name_unique unique (module_id, name)
);

-- 4) Concepts under subtopics
create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  name text not null,
  body text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concepts_subtopic_name_unique unique (subtopic_id, name)
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists trg_topics_updated_at on public.topics;
create trigger trg_topics_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists trg_subtopics_updated_at on public.subtopics;
create trigger trg_subtopics_updated_at
before update on public.subtopics
for each row execute function public.set_updated_at();

drop trigger if exists trg_concepts_updated_at on public.concepts;
create trigger trg_concepts_updated_at
before update on public.concepts
for each row execute function public.set_updated_at();

-- Optional: auto-create student profile row after auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.students (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1), 'Student'),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helpful indexes
create index if not exists idx_topics_student_id on public.topics(student_id);
create index if not exists idx_subtopics_module_id on public.subtopics(module_id);
create index if not exists idx_concepts_subtopic_id on public.concepts(subtopic_id);

-- -------------------------
-- RLS: secure by owner only
-- -------------------------
alter table public.students enable row level security;
alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.concepts enable row level security;

-- Students policies
-- Own profile only
drop policy if exists students_select_own on public.students;
create policy students_select_own
on public.students
for select
using (auth.uid() = id);

drop policy if exists students_insert_own on public.students;
create policy students_insert_own
on public.students
for insert
with check (auth.uid() = id);

drop policy if exists students_update_own on public.students;
create policy students_update_own
on public.students
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Topics policies
drop policy if exists topics_select_own on public.topics;
create policy topics_select_own
on public.topics
for select
using (auth.uid() = student_id);

drop policy if exists topics_insert_own on public.topics;
create policy topics_insert_own
on public.topics
for insert
with check (auth.uid() = student_id);

drop policy if exists topics_update_own on public.topics;
create policy topics_update_own
on public.topics
for update
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

drop policy if exists topics_delete_own on public.topics;
create policy topics_delete_own
on public.topics
for delete
using (auth.uid() = student_id);

-- Subtopics policies: only if parent topic belongs to current user
drop policy if exists subtopics_select_own on public.subtopics;
create policy subtopics_select_own
on public.subtopics
for select
using (
  exists (
    select 1
    from public.topics
    where module_id = subtopics.module_id
      and student_id = auth.uid()
  )
);

drop policy if exists subtopics_insert_own on public.subtopics;
create policy subtopics_insert_own
on public.subtopics
for insert
with check (
  exists (
    select 1
    from public.topics
    where module_id = subtopics.module_id
      and student_id = auth.uid()
  )
);

drop policy if exists subtopics_update_own on public.subtopics;
create policy subtopics_update_own
on public.subtopics
for update
using (
  exists (
    select 1
    from public.topics
    where module_id = subtopics.module_id
      and student_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.topics
    where module_id = subtopics.module_id
      and student_id = auth.uid()
  )
);

drop policy if exists subtopics_delete_own on public.subtopics;
create policy subtopics_delete_own
on public.subtopics
for delete
using (
  exists (
    select 1
    from public.topics
    where module_id = subtopics.module_id
      and student_id = auth.uid()
  )
);

-- Concepts policies: only if parent subtopic -> topic belongs to current user
drop policy if exists concepts_select_own on public.concepts;
create policy concepts_select_own
on public.concepts
for select
using (
  exists (
    select 1
    from public.subtopics s
    join public.topics on public.topics.module_id = s.module_id
    where s.id = concepts.subtopic_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists concepts_insert_own on public.concepts;
create policy concepts_insert_own
on public.concepts
for insert
with check (
  exists (
    select 1
    from public.subtopics s
    join public.topics on public.topics.module_id = s.module_id
    where s.id = concepts.subtopic_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists concepts_update_own on public.concepts;
create policy concepts_update_own
on public.concepts
for update
using (
  exists (
    select 1
    from public.subtopics s
    join public.topics on public.topics.module_id = s.module_id
    where s.id = concepts.subtopic_id
      and public.topics.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.subtopics s
    join public.topics on public.topics.module_id = s.module_id
    where s.id = concepts.subtopic_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists concepts_delete_own on public.concepts;
create policy concepts_delete_own
on public.concepts
for delete
using (
  exists (
    select 1
    from public.subtopics s
    join public.topics on public.topics.module_id = s.module_id
    where s.id = concepts.subtopic_id
      and public.topics.student_id = auth.uid()
  )
);

-- Column compatibility maintenance (optional)
update public.topics
set module_id = coalesce(module_id, id)
where module_id is null;
