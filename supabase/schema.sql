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
  last_studied_at timestamptz,
  overall_mastery integer not null default 0 check (overall_mastery between 0 and 100),
  status text not null default 'on-track' check (status in ('on-track','needs-review','inactive')),
  status_label text not null default 'On track',
  learning_summary text[] not null default '{}',
  last_check_in_at timestamptz,
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
  review_interval_days integer not null default 1 check (review_interval_days >= 1),
  last_reviewed_at timestamptz,
  review_due_at timestamptz,
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

-- 5) Diagnostic profile per topic/module
create table if not exists public.topic_diagnostics (
  module_id uuid primary key references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  goal text not null,
  deadline date,
  weekly_study_minutes integer not null default 90 check (weekly_study_minutes between 30 and 1200),
  baseline_confidence integer not null default 50 check (baseline_confidence between 0 and 100),
  known_weak_areas text[] not null default '{}',
  constraints text,
  recommended_focus text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6) Uploaded or pasted study material metadata
create table if not exists public.study_material_uploads (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  source_name text not null,
  category text not null default 'Lecture' check (category in ('Lecture','PYP','Tutorial','Labs')),
  mime_type text,
  content_excerpt text,
  source_kind text not null default 'upload' check (source_kind in ('upload','clipboard','generated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7) Source references attached to subtopics after extraction
create table if not exists public.subtopic_source_references (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  upload_id uuid references public.study_material_uploads(id) on delete set null,
  source_name text not null,
  snippet text,
  created_at timestamptz not null default now(),
  constraint subtopic_source_reference_unique unique (subtopic_id, source_name, snippet)
);

-- 8) Explicit review outcomes that drive mastery and scheduling
create table if not exists public.subtopic_review_events (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  outcome text not null check (outcome in ('mastered','struggled','missed')),
  event_source text not null check (event_source in ('due-review','chat','quiz','diagnostic')),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- 9) Historical mastery snapshots for subtopics
create table if not exists public.subtopic_mastery_history (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  reason text not null,
  recorded_at timestamptz not null default now()
);

-- 10) Mistake records used for targeted review and coaching
create table if not exists public.topic_mistake_records (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subtopic_id uuid references public.subtopics(id) on delete set null,
  severity text not null check (severity in ('high','medium','low')),
  trigger text not null,
  next_step text not null,
  created_at timestamptz not null default now()
);

-- 11) Generated weekly plan blocks for the study coach
create table if not exists public.topic_weekly_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  reason text not null,
  minutes integer not null check (minutes between 1 and 600),
  block_type text not null check (block_type in ('review','focus','deadline','recovery')),
  scheduled_for date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12) Accountability and streak summary per topic/module
create table if not exists public.topic_accountability_state (
  module_id uuid primary key references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  streak_days integer not null default 0 check (streak_days >= 0),
  last_nudge_at timestamptz,
  last_check_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 13) Individual completed review dates to rebuild streaks accurately
create table if not exists public.topic_accountability_days (
  module_id uuid not null references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  primary key (module_id, completed_on)
);

-- 14) Durable chat messages and trust metadata
create table if not exists public.topic_chat_messages (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.topics(module_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role text not null check (role in ('ai','student')),
  content text not null,
  confidence text check (confidence in ('high','medium','low')),
  confidence_reason text,
  message_mode text,
  created_at timestamptz not null default now()
);

-- 15) Attachments linked to persisted chat messages
create table if not exists public.topic_chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.topic_chat_messages(id) on delete cascade,
  source_name text not null,
  size_label text,
  category text not null check (category in ('Lecture','PYP','Tutorial','Labs')),
  mime_type text,
  content_excerpt text,
  created_at timestamptz not null default now()
);

-- 16) Citations linked to persisted AI messages
create table if not exists public.topic_chat_message_citations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.topic_chat_messages(id) on delete cascade,
  source_name text not null,
  snippet text,
  created_at timestamptz not null default now()
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

drop trigger if exists trg_topic_diagnostics_updated_at on public.topic_diagnostics;
create trigger trg_topic_diagnostics_updated_at
before update on public.topic_diagnostics
for each row execute function public.set_updated_at();

drop trigger if exists trg_study_material_uploads_updated_at on public.study_material_uploads;
create trigger trg_study_material_uploads_updated_at
before update on public.study_material_uploads
for each row execute function public.set_updated_at();

drop trigger if exists trg_topic_weekly_plan_blocks_updated_at on public.topic_weekly_plan_blocks;
create trigger trg_topic_weekly_plan_blocks_updated_at
before update on public.topic_weekly_plan_blocks
for each row execute function public.set_updated_at();

drop trigger if exists trg_topic_accountability_state_updated_at on public.topic_accountability_state;
create trigger trg_topic_accountability_state_updated_at
before update on public.topic_accountability_state
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
create index if not exists idx_topic_diagnostics_student_id on public.topic_diagnostics(student_id);
create index if not exists idx_study_material_uploads_module_id on public.study_material_uploads(module_id);
create index if not exists idx_study_material_uploads_student_id on public.study_material_uploads(student_id);
create index if not exists idx_subtopic_source_references_subtopic_id on public.subtopic_source_references(subtopic_id);
create index if not exists idx_subtopic_review_events_module_id on public.subtopic_review_events(module_id);
create index if not exists idx_subtopic_review_events_subtopic_id on public.subtopic_review_events(subtopic_id);
create index if not exists idx_subtopic_mastery_history_subtopic_id on public.subtopic_mastery_history(subtopic_id);
create index if not exists idx_topic_mistake_records_module_id on public.topic_mistake_records(module_id);
create index if not exists idx_topic_weekly_plan_blocks_module_id on public.topic_weekly_plan_blocks(module_id);
create index if not exists idx_topic_accountability_days_student_id on public.topic_accountability_days(student_id);
create index if not exists idx_topic_chat_messages_module_id on public.topic_chat_messages(module_id);
create index if not exists idx_topic_chat_attachments_message_id on public.topic_chat_attachments(message_id);
create index if not exists idx_topic_chat_message_citations_message_id on public.topic_chat_message_citations(message_id);

-- -------------------------
-- RLS: secure by owner only
-- -------------------------
alter table public.students enable row level security;
alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.concepts enable row level security;
alter table public.topic_diagnostics enable row level security;
alter table public.study_material_uploads enable row level security;
alter table public.subtopic_source_references enable row level security;
alter table public.subtopic_review_events enable row level security;
alter table public.subtopic_mastery_history enable row level security;
alter table public.topic_mistake_records enable row level security;
alter table public.topic_weekly_plan_blocks enable row level security;
alter table public.topic_accountability_state enable row level security;
alter table public.topic_accountability_days enable row level security;
alter table public.topic_chat_messages enable row level security;
alter table public.topic_chat_attachments enable row level security;
alter table public.topic_chat_message_citations enable row level security;

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

-- Topic diagnostics policies
drop policy if exists topic_diagnostics_select_own on public.topic_diagnostics;
create policy topic_diagnostics_select_own
on public.topic_diagnostics
for select
using (student_id = auth.uid());

drop policy if exists topic_diagnostics_insert_own on public.topic_diagnostics;
create policy topic_diagnostics_insert_own
on public.topic_diagnostics
for insert
with check (student_id = auth.uid());

drop policy if exists topic_diagnostics_update_own on public.topic_diagnostics;
create policy topic_diagnostics_update_own
on public.topic_diagnostics
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists topic_diagnostics_delete_own on public.topic_diagnostics;
create policy topic_diagnostics_delete_own
on public.topic_diagnostics
for delete
using (student_id = auth.uid());

-- Study material upload policies
drop policy if exists study_material_uploads_select_own on public.study_material_uploads;
create policy study_material_uploads_select_own
on public.study_material_uploads
for select
using (student_id = auth.uid());

drop policy if exists study_material_uploads_insert_own on public.study_material_uploads;
create policy study_material_uploads_insert_own
on public.study_material_uploads
for insert
with check (student_id = auth.uid());

drop policy if exists study_material_uploads_update_own on public.study_material_uploads;
create policy study_material_uploads_update_own
on public.study_material_uploads
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists study_material_uploads_delete_own on public.study_material_uploads;
create policy study_material_uploads_delete_own
on public.study_material_uploads
for delete
using (student_id = auth.uid());

-- Subtopic source reference policies
drop policy if exists subtopic_source_references_select_own on public.subtopic_source_references;
create policy subtopic_source_references_select_own
on public.subtopic_source_references
for select
using (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = subtopic_source_references.subtopic_id
      and t.student_id = auth.uid()
  )
);

drop policy if exists subtopic_source_references_insert_own on public.subtopic_source_references;
create policy subtopic_source_references_insert_own
on public.subtopic_source_references
for insert
with check (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = subtopic_source_references.subtopic_id
      and t.student_id = auth.uid()
  )
);

drop policy if exists subtopic_source_references_delete_own on public.subtopic_source_references;
create policy subtopic_source_references_delete_own
on public.subtopic_source_references
for delete
using (
  exists (
    select 1
    from public.subtopics s
    join public.topics t on t.module_id = s.module_id
    where s.id = subtopic_source_references.subtopic_id
      and t.student_id = auth.uid()
  )
);

-- Review event policies
drop policy if exists subtopic_review_events_select_own on public.subtopic_review_events;
create policy subtopic_review_events_select_own
on public.subtopic_review_events
for select
using (student_id = auth.uid());

drop policy if exists subtopic_review_events_insert_own on public.subtopic_review_events;
create policy subtopic_review_events_insert_own
on public.subtopic_review_events
for insert
with check (student_id = auth.uid());

drop policy if exists subtopic_review_events_update_own on public.subtopic_review_events;
create policy subtopic_review_events_update_own
on public.subtopic_review_events
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists subtopic_review_events_delete_own on public.subtopic_review_events;
create policy subtopic_review_events_delete_own
on public.subtopic_review_events
for delete
using (student_id = auth.uid());

-- Mastery history policies
drop policy if exists subtopic_mastery_history_select_own on public.subtopic_mastery_history;
create policy subtopic_mastery_history_select_own
on public.subtopic_mastery_history
for select
using (student_id = auth.uid());

drop policy if exists subtopic_mastery_history_insert_own on public.subtopic_mastery_history;
create policy subtopic_mastery_history_insert_own
on public.subtopic_mastery_history
for insert
with check (student_id = auth.uid());

drop policy if exists subtopic_mastery_history_update_own on public.subtopic_mastery_history;
create policy subtopic_mastery_history_update_own
on public.subtopic_mastery_history
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists subtopic_mastery_history_delete_own on public.subtopic_mastery_history;
create policy subtopic_mastery_history_delete_own
on public.subtopic_mastery_history
for delete
using (student_id = auth.uid());

-- Mistake record policies
drop policy if exists topic_mistake_records_select_own on public.topic_mistake_records;
create policy topic_mistake_records_select_own
on public.topic_mistake_records
for select
using (student_id = auth.uid());

drop policy if exists topic_mistake_records_insert_own on public.topic_mistake_records;
create policy topic_mistake_records_insert_own
on public.topic_mistake_records
for insert
with check (student_id = auth.uid());

drop policy if exists topic_mistake_records_update_own on public.topic_mistake_records;
create policy topic_mistake_records_update_own
on public.topic_mistake_records
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists topic_mistake_records_delete_own on public.topic_mistake_records;
create policy topic_mistake_records_delete_own
on public.topic_mistake_records
for delete
using (student_id = auth.uid());

-- Weekly plan policies
drop policy if exists topic_weekly_plan_blocks_select_own on public.topic_weekly_plan_blocks;
create policy topic_weekly_plan_blocks_select_own
on public.topic_weekly_plan_blocks
for select
using (student_id = auth.uid());

drop policy if exists topic_weekly_plan_blocks_insert_own on public.topic_weekly_plan_blocks;
create policy topic_weekly_plan_blocks_insert_own
on public.topic_weekly_plan_blocks
for insert
with check (student_id = auth.uid());

drop policy if exists topic_weekly_plan_blocks_update_own on public.topic_weekly_plan_blocks;
create policy topic_weekly_plan_blocks_update_own
on public.topic_weekly_plan_blocks
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists topic_weekly_plan_blocks_delete_own on public.topic_weekly_plan_blocks;
create policy topic_weekly_plan_blocks_delete_own
on public.topic_weekly_plan_blocks
for delete
using (student_id = auth.uid());

-- Accountability state policies
drop policy if exists topic_accountability_state_select_own on public.topic_accountability_state;
create policy topic_accountability_state_select_own
on public.topic_accountability_state
for select
using (student_id = auth.uid());

drop policy if exists topic_accountability_state_insert_own on public.topic_accountability_state;
create policy topic_accountability_state_insert_own
on public.topic_accountability_state
for insert
with check (student_id = auth.uid());

drop policy if exists topic_accountability_state_update_own on public.topic_accountability_state;
create policy topic_accountability_state_update_own
on public.topic_accountability_state
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists topic_accountability_state_delete_own on public.topic_accountability_state;
create policy topic_accountability_state_delete_own
on public.topic_accountability_state
for delete
using (student_id = auth.uid());

-- Accountability days policies
drop policy if exists topic_accountability_days_select_own on public.topic_accountability_days;
create policy topic_accountability_days_select_own
on public.topic_accountability_days
for select
using (student_id = auth.uid());

drop policy if exists topic_accountability_days_insert_own on public.topic_accountability_days;
create policy topic_accountability_days_insert_own
on public.topic_accountability_days
for insert
with check (student_id = auth.uid());

drop policy if exists topic_accountability_days_delete_own on public.topic_accountability_days;
create policy topic_accountability_days_delete_own
on public.topic_accountability_days
for delete
using (student_id = auth.uid());

-- Chat message policies
drop policy if exists topic_chat_messages_select_own on public.topic_chat_messages;
create policy topic_chat_messages_select_own
on public.topic_chat_messages
for select
using (student_id = auth.uid());

drop policy if exists topic_chat_messages_insert_own on public.topic_chat_messages;
create policy topic_chat_messages_insert_own
on public.topic_chat_messages
for insert
with check (student_id = auth.uid());

drop policy if exists topic_chat_messages_update_own on public.topic_chat_messages;
create policy topic_chat_messages_update_own
on public.topic_chat_messages
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists topic_chat_messages_delete_own on public.topic_chat_messages;
create policy topic_chat_messages_delete_own
on public.topic_chat_messages
for delete
using (student_id = auth.uid());

-- Chat attachment policies
drop policy if exists topic_chat_attachments_select_own on public.topic_chat_attachments;
create policy topic_chat_attachments_select_own
on public.topic_chat_attachments
for select
using (
  exists (
    select 1
    from public.topic_chat_messages m
    where m.id = topic_chat_attachments.message_id
      and m.student_id = auth.uid()
  )
);

drop policy if exists topic_chat_attachments_insert_own on public.topic_chat_attachments;
create policy topic_chat_attachments_insert_own
on public.topic_chat_attachments
for insert
with check (
  exists (
    select 1
    from public.topic_chat_messages m
    where m.id = topic_chat_attachments.message_id
      and m.student_id = auth.uid()
  )
);

drop policy if exists topic_chat_attachments_delete_own on public.topic_chat_attachments;
create policy topic_chat_attachments_delete_own
on public.topic_chat_attachments
for delete
using (
  exists (
    select 1
    from public.topic_chat_messages m
    where m.id = topic_chat_attachments.message_id
      and m.student_id = auth.uid()
  )
);

-- Chat citation policies
drop policy if exists topic_chat_message_citations_select_own on public.topic_chat_message_citations;
create policy topic_chat_message_citations_select_own
on public.topic_chat_message_citations
for select
using (
  exists (
    select 1
    from public.topic_chat_messages m
    where m.id = topic_chat_message_citations.message_id
      and m.student_id = auth.uid()
  )
);

drop policy if exists topic_chat_message_citations_insert_own on public.topic_chat_message_citations;
create policy topic_chat_message_citations_insert_own
on public.topic_chat_message_citations
for insert
with check (
  exists (
    select 1
    from public.topic_chat_messages m
    where m.id = topic_chat_message_citations.message_id
      and m.student_id = auth.uid()
  )
);

drop policy if exists topic_chat_message_citations_delete_own on public.topic_chat_message_citations;
create policy topic_chat_message_citations_delete_own
on public.topic_chat_message_citations
for delete
using (
  exists (
    select 1
    from public.topic_chat_messages m
    where m.id = topic_chat_message_citations.message_id
      and m.student_id = auth.uid()
  )
);

-- Column compatibility maintenance (optional)
update public.topics
set module_id = coalesce(module_id, id)
where module_id is null;
