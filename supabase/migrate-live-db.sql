-- Non-destructive migration to align older live Supabase projects
-- with the schema expected by this repository.
--
-- What this migration does:
-- 1) Preserves older tables like public.modules, public.attempts, public.sessions.
-- 2) Upgrades public.students, public.topics, public.subtopics, and public.concepts.
-- 3) Makes the current supabase/seed.sql compatible with older projects.
--
-- Recommended order:
-- 1) Run this file once on the existing project.
-- 2) Run supabase/schema.sql.
-- 3) Run supabase/seed.sql if you want demo data.

create extension if not exists pgcrypto;

-- Ensure a students row exists for every auth user referenced by current app tables.
insert into public.students as students (id, name, email)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'username', split_part(coalesce(au.email, ''), '@', 1), 'Student') as name,
  coalesce(au.email, '') as email
from auth.users au
on conflict (id) do update
set email = excluded.email,
    name = case
      when coalesce(students.name, '') = '' then excluded.name
      else students.name
    end;

-- Add missing timestamp columns used by the repo schema.
alter table public.students add column if not exists created_at timestamptz not null default now();
alter table public.students add column if not exists updated_at timestamptz not null default now();

alter table public.topics add column if not exists subtitle text not null default '';
alter table public.topics add column if not exists tags text[] not null default '{}';
alter table public.topics add column if not exists last_studied_at timestamptz;
alter table public.topics add column if not exists overall_mastery integer not null default 0;
alter table public.topics add column if not exists status text not null default 'on-track';
alter table public.topics add column if not exists status_label text not null default 'On track';
alter table public.topics add column if not exists learning_summary text[] not null default '{}';
alter table public.topics add column if not exists last_check_in_at timestamptz;
alter table public.topics add column if not exists created_at timestamptz not null default now();
alter table public.topics add column if not exists updated_at timestamptz not null default now();
alter table public.topics add column if not exists module_id uuid;

alter table public.subtopics add column if not exists created_at timestamptz not null default now();
alter table public.subtopics add column if not exists updated_at timestamptz not null default now();
alter table public.subtopics add column if not exists mastery integer not null default 0;
alter table public.subtopics add column if not exists mistake_count integer not null default 0;
alter table public.subtopics add column if not exists attempts integer not null default 0;
alter table public.subtopics add column if not exists completed boolean not null default false;
alter table public.subtopics add column if not exists forgetting_risk text not null default 'low';
alter table public.subtopics add column if not exists review_interval_days integer not null default 1;
alter table public.subtopics add column if not exists last_reviewed_at timestamptz;
alter table public.subtopics add column if not exists review_due_at timestamptz;

alter table public.concepts add column if not exists created_at timestamptz not null default now();
alter table public.concepts add column if not exists updated_at timestamptz not null default now();
alter table public.concepts add column if not exists body text;
alter table public.concepts add column if not exists difficulty text not null default 'medium';
alter table public.concepts add column if not exists position integer not null default 0;

-- Backfill and normalize topics.module_id if older rows are missing it.
update public.topics
set module_id = coalesce(module_id, gen_random_uuid())
where module_id is null;

alter table public.topics alter column module_id set not null;

alter table public.topics
  drop constraint if exists topics_overall_mastery_check;
alter table public.topics
  add constraint topics_overall_mastery_check
  check (overall_mastery between 0 and 100);

alter table public.topics
  drop constraint if exists topics_status_check;
alter table public.topics
  add constraint topics_status_check
  check (status in ('on-track', 'needs-review', 'inactive'));

-- If the older schema added a required created_by field on subtopics,
-- give it a safe default so current seed inserts work.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subtopics'
      and column_name = 'created_by'
  ) then
    execute $sql$alter table public.subtopics alter column created_by set default 'ai'$sql$;
  end if;
end $$;

-- Map old subtopics.module_id values from public.modules.id to public.topics.module_id
-- when topic_id is available from the older schema.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subtopics'
      and column_name = 'topic_id'
  ) then
    update public.subtopics s
    set module_id = t.module_id
    from public.topics t
    where s.topic_id = t.id
      and s.module_id is distinct from t.module_id;
  end if;
end $$;

-- Constraints expected by the current repo schema.
alter table public.subtopics
  drop constraint if exists subtopics_module_id_fkey;

alter table public.topics
  drop constraint if exists topics_student_id_fkey;

alter table public.topics
  add constraint topics_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade;

alter table public.subtopics
  add constraint subtopics_module_id_fkey
  foreign key (module_id) references public.topics(module_id) on delete cascade;

alter table public.concepts
  drop constraint if exists concepts_subtopic_id_fkey;

alter table public.concepts
  add constraint concepts_subtopic_id_fkey
  foreign key (subtopic_id) references public.subtopics(id) on delete cascade;

-- Add repo-compatible checks and uniqueness where missing.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'topics_student_name_unique'
  ) then
    alter table public.topics
      add constraint topics_student_name_unique unique (student_id, name);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subtopics_module_name_unique'
  ) then
    alter table public.subtopics
      add constraint subtopics_module_name_unique unique (module_id, name);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'concepts_subtopic_name_unique'
  ) then
    alter table public.concepts
      add constraint concepts_subtopic_name_unique unique (subtopic_id, name);
  end if;
end $$;

alter table public.subtopics
  drop constraint if exists subtopics_forgetting_risk_check;
alter table public.subtopics
  add constraint subtopics_forgetting_risk_check
  check (forgetting_risk in ('low', 'medium', 'high'));

alter table public.subtopics
  drop constraint if exists subtopics_mastery_check;
alter table public.subtopics
  add constraint subtopics_mastery_check
  check (mastery between 0 and 100);

alter table public.subtopics
  drop constraint if exists subtopics_mistake_count_check;
alter table public.subtopics
  add constraint subtopics_mistake_count_check
  check (mistake_count >= 0);

alter table public.subtopics
  drop constraint if exists subtopics_attempts_check;
alter table public.subtopics
  add constraint subtopics_attempts_check
  check (attempts >= 0);

alter table public.subtopics
  drop constraint if exists subtopics_review_interval_days_check;
alter table public.subtopics
  add constraint subtopics_review_interval_days_check
  check (review_interval_days >= 1);

alter table public.concepts
  drop constraint if exists concepts_difficulty_check;
alter table public.concepts
  add constraint concepts_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));

-- Keep updated_at fresh.
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

-- Auto-create / refresh student profile row when a new auth user signs up.
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

-- Helpful indexes.
create index if not exists idx_topics_student_id on public.topics(student_id);
create index if not exists idx_subtopics_module_id on public.subtopics(module_id);
create index if not exists idx_concepts_subtopic_id on public.concepts(subtopic_id);

-- RLS expected by the current app.
alter table public.students enable row level security;
alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.concepts enable row level security;

drop policy if exists students_select_own on public.students;
create policy students_select_own on public.students
for select using (auth.uid() = id);

drop policy if exists students_insert_own on public.students;
create policy students_insert_own on public.students
for insert with check (auth.uid() = id);

drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists topics_select_own on public.topics;
create policy topics_select_own on public.topics
for select using (auth.uid() = student_id);

drop policy if exists topics_insert_own on public.topics;
create policy topics_insert_own on public.topics
for insert with check (auth.uid() = student_id);

drop policy if exists topics_update_own on public.topics;
create policy topics_update_own on public.topics
for update using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists topics_delete_own on public.topics;
create policy topics_delete_own on public.topics
for delete using (auth.uid() = student_id);

drop policy if exists subtopics_select_own on public.subtopics;
create policy subtopics_select_own on public.subtopics
for select using (
  exists (
    select 1 from public.topics
    where public.topics.module_id = public.subtopics.module_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists subtopics_insert_own on public.subtopics;
create policy subtopics_insert_own on public.subtopics
for insert with check (
  exists (
    select 1 from public.topics
    where public.topics.module_id = public.subtopics.module_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists subtopics_update_own on public.subtopics;
create policy subtopics_update_own on public.subtopics
for update using (
  exists (
    select 1 from public.topics
    where public.topics.module_id = public.subtopics.module_id
      and public.topics.student_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.topics
    where public.topics.module_id = public.subtopics.module_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists subtopics_delete_own on public.subtopics;
create policy subtopics_delete_own on public.subtopics
for delete using (
  exists (
    select 1 from public.topics
    where public.topics.module_id = public.subtopics.module_id
      and public.topics.student_id = auth.uid()
  )
);

drop policy if exists concepts_select_own on public.concepts;
create policy concepts_select_own on public.concepts
for select using (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = public.concepts.subtopic_id
      and t.student_id = auth.uid()
  )
);

drop policy if exists concepts_insert_own on public.concepts;
create policy concepts_insert_own on public.concepts
for insert with check (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = public.concepts.subtopic_id
      and t.student_id = auth.uid()
  )
);

drop policy if exists concepts_update_own on public.concepts;
create policy concepts_update_own on public.concepts
for update using (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = public.concepts.subtopic_id
      and t.student_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = public.concepts.subtopic_id
      and t.student_id = auth.uid()
  )
);

drop policy if exists concepts_delete_own on public.concepts;
create policy concepts_delete_own on public.concepts
for delete using (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = public.concepts.subtopic_id
      and t.student_id = auth.uid()
  )
);

-- Quick verification helpers after running:
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'students';
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'topics';
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'subtopics';
-- select conname from pg_constraint where conrelid = 'public.subtopics'::regclass;
