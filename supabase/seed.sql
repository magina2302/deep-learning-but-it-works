-- Clean, idempotent seed for schema.sql (topics/subtopics/concepts)
-- Safe to run multiple times.
--
-- How to use:
-- 1) Run supabase/schema.sql first.
-- 2) Sign up at least one user in Supabase Auth.
-- 3) Optionally set target_email below to seed only one user.
--    Leave it as null to seed every existing auth user.

with seed_config as (
  select
    null::text as target_email
    -- Example:
    -- 'student@example.com'::text as target_email
),
target_users as (
  select au.id, au.email
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
ensured_students as (
  insert into public.students (id, name, email)
  select
    tu.id,
    coalesce(split_part(coalesce(tu.email, ''), '@', 1), 'Student') as name,
    coalesce(tu.email, '') as email
  from target_users tu
  on conflict (id) do update
    set email = excluded.email
  returning id, email
),
topic_defs as (
  select *
  from (
    values
      ('Linear Algebra', 'Vectors, matrices & transformations', array['Mathematics','Core']::text[]),
      ('Signals and Systems', 'Continuous and discrete-time signal analysis', array['Engineering','Core']::text[])
  ) as v(name, subtitle, tags)
),
topic_rows as (
  insert into public.topics (student_id, name, subtitle, tags, module_id)
  select s.id, d.name, d.subtitle, d.tags, gen_random_uuid()
  from ensured_students s
  cross join topic_defs d
  on conflict (student_id, name) do update
    set subtitle = excluded.subtitle,
        tags = excluded.tags
  returning id, module_id, student_id, name
),
subtopic_defs as (
  select *
  from (
    values
      ('Linear Algebra', 'Vector Spaces', 35, 3, 2, false, 'medium', 2, 2, 0),
      ('Linear Algebra', 'Matrix Multiplication', 28, 5, 4, false, 'high', 1, 3, -1),
      ('Linear Algebra', 'Eigenvalues & Eigenvectors', 12, 4, 2, false, 'high', 1, 4, -2),
      ('Signals and Systems', 'Signal Classification', 46, 2, 2, false, 'medium', 3, 1, 1),
      ('Signals and Systems', 'Convolution', 20, 6, 4, false, 'high', 1, 2, -1),
      ('Signals and Systems', 'Laplace Transform', 30, 4, 3, false, 'medium', 2, 3, 0)
  ) as v(topic_name, subtopic_name, mastery, mistake_count, attempts, completed, forgetting_risk, review_interval_days, last_reviewed_days_ago, review_due_offset_days)
),
subtopic_rows as (
  insert into public.subtopics (
    module_id,
    name,
    mastery,
    mistake_count,
    attempts,
    completed,
    forgetting_risk,
    review_interval_days,
    last_reviewed_at,
    review_due_at
  )
  select t.module_id,
         s.subtopic_name,
         s.mastery,
         s.mistake_count,
         s.attempts,
         s.completed,
         s.forgetting_risk,
         s.review_interval_days,
         now() - (s.last_reviewed_days_ago * interval '1 day'),
         now() + (s.review_due_offset_days * interval '1 day')
  from topic_rows t
  join subtopic_defs s on s.topic_name = t.name
  on conflict (module_id, name) do update
    set mastery = excluded.mastery,
        mistake_count = excluded.mistake_count,
        attempts = excluded.attempts,
        completed = excluded.completed,
        forgetting_risk = excluded.forgetting_risk,
        review_interval_days = excluded.review_interval_days,
        last_reviewed_at = excluded.last_reviewed_at,
        review_due_at = excluded.review_due_at
  returning id, module_id, name
),
concept_defs as (
  select *
  from (
    values
      ('Vector Spaces', 'Basis and Dimension', 'Understand linear independence, spanning sets, and basis construction.', 'medium', 1),
      ('Vector Spaces', 'Subspaces', 'Test closure properties and identify valid subspaces.', 'easy', 2),
      ('Matrix Multiplication', 'Row by Column Rule', 'Compute product dimensions and entries correctly.', 'easy', 1),
      ('Matrix Multiplication', 'Associativity and Non-Commutativity', 'Recognize valid reorderings and common traps.', 'medium', 2),
      ('Eigenvalues & Eigenvectors', 'Characteristic Polynomial', 'Form det(A - λI) and solve for λ.', 'hard', 1),
      ('Eigenvalues & Eigenvectors', 'Diagonalization Conditions', 'Check eigenvector independence and matrix similarity.', 'hard', 2),
      ('Signal Classification', 'Energy vs Power Signals', 'Classify signals based on finite energy/power criteria.', 'easy', 1),
      ('Signal Classification', 'Periodic vs Aperiodic', 'Identify periodicity and fundamental period.', 'easy', 2),
      ('Convolution', 'Graphical Convolution', 'Flip-shift-multiply-integrate workflow for convolution.', 'medium', 1),
      ('Convolution', 'LTI System Response', 'Use convolution to compute output from impulse response.', 'hard', 2),
      ('Laplace Transform', 'ROC and Stability', 'Relate region of convergence to system causality/stability.', 'hard', 1),
      ('Laplace Transform', 'Partial Fraction Expansion', 'Invert transforms using decomposition techniques.', 'medium', 2)
  ) as v(subtopic_name, concept_name, body, difficulty, position)
)
insert into public.concepts (subtopic_id, name, body, difficulty, position)
select s.id,
       c.concept_name,
       c.body,
       c.difficulty,
       c.position
from subtopic_rows s
join concept_defs c on c.subtopic_name = s.name
on conflict (subtopic_id, name) do update
set body = excluded.body,
    difficulty = excluded.difficulty,
  position = excluded.position;

-- Optional quick check after running:
-- select id, email from auth.users order by created_at desc;
-- select id, email from public.students order by created_at desc;
-- select name, subtitle from public.topics order by created_at asc;

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_topics as (
  select t.module_id, t.student_id, t.name
  from public.topics t
  join target_users u on u.id = t.student_id
),
diagnostic_defs as (
  select *
  from (
    values
      ('Linear Algebra', 'Score above 75% in the next linear algebra quiz', current_date + 14, 180, 45, array['Matrix Multiplication','Eigenvalues & Eigenvectors']::text[], 'Focus on short daily practice blocks', array['Matrix Multiplication','Eigenvalues & Eigenvectors']::text[]),
      ('Signals and Systems', 'Be exam-ready for the next signals and systems assessment', current_date + 12, 210, 55, array['Convolution','Laplace Transform']::text[], 'Prioritize retrieval over rereading notes', array['Convolution','LTI System Response']::text[])
  ) as v(topic_name, goal, deadline, weekly_study_minutes, baseline_confidence, known_weak_areas, constraints, recommended_focus)
)
insert into public.topic_diagnostics (module_id, student_id, goal, deadline, weekly_study_minutes, baseline_confidence, known_weak_areas, constraints, recommended_focus)
select t.module_id, t.student_id, d.goal, d.deadline, d.weekly_study_minutes, d.baseline_confidence, d.known_weak_areas, d.constraints, d.recommended_focus
from targeted_topics t
join diagnostic_defs d on d.topic_name = t.name
on conflict (module_id) do update
set goal = excluded.goal,
    deadline = excluded.deadline,
    weekly_study_minutes = excluded.weekly_study_minutes,
    baseline_confidence = excluded.baseline_confidence,
    known_weak_areas = excluded.known_weak_areas,
    constraints = excluded.constraints,
    recommended_focus = excluded.recommended_focus;

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_topics as (
  select t.module_id, t.student_id, t.name
  from public.topics t
  join target_users u on u.id = t.student_id
),
upload_defs as (
  select *
  from (
    values
      ('Linear Algebra', 'Linear Algebra Notes.pdf', 'Lecture', 'application/pdf', 'upload', 'Covers vector spaces, matrices, and eigenvalue workflows.'),
      ('Signals and Systems', 'Signals and Systems Notes.pdf', 'Lecture', 'application/pdf', 'upload', 'Covers signal classification, convolution, and Laplace transforms.')
  ) as v(topic_name, source_name, category, mime_type, source_kind, content_excerpt)
)
insert into public.study_material_uploads (module_id, student_id, source_name, category, mime_type, source_kind, content_excerpt)
select t.module_id, t.student_id, d.source_name, d.category, d.mime_type, d.source_kind, d.content_excerpt
from targeted_topics t
join upload_defs d on d.topic_name = t.name
where not exists (
  select 1
  from public.study_material_uploads u
  where u.module_id = t.module_id
    and u.source_name = d.source_name
    and u.source_kind = d.source_kind
);

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_subtopics as (
  select s.id as subtopic_id, s.module_id, s.name as subtopic_name, t.student_id, t.name as topic_name
  from public.subtopics s
  join public.topics t on t.module_id = s.module_id
  join target_users u on u.id = t.student_id
),
review_defs as (
  select *
  from (
    values
      ('Matrix Multiplication', 'missed', 'due-review', 'Mixed up row-by-column dimensions on a review prompt'),
      ('Eigenvalues & Eigenvectors', 'struggled', 'due-review', 'Could set up the characteristic polynomial but stalled on solving it'),
      ('Convolution', 'missed', 'due-review', 'Overlap boundaries were still unclear during review'),
      ('Laplace Transform', 'struggled', 'quiz', 'Needed a hint to identify the right partial fraction structure')
  ) as v(subtopic_name, outcome, event_source, note)
),
mistake_defs as (
  select *
  from (
    values
      ('Matrix Multiplication', 'high', 'Mixed up matrix dimension compatibility', 'Redo one dimension-check drill before solving another full question.'),
      ('Convolution', 'high', 'Still uncertain about overlap intervals', 'Practice one graphical convolution step by step before a timed attempt.'),
      ('Laplace Transform', 'medium', 'Partial fraction setup is not yet automatic', 'Do one worked example, then one closed-book inversion question.')
  ) as v(subtopic_name, severity, trigger, next_step)
),
mastery_defs as (
  select *
  from (
    values
      ('Vector Spaces', 35, 'Seed baseline from diagnostic and prior practice'),
      ('Matrix Multiplication', 28, 'Seed baseline from diagnostic and prior practice'),
      ('Eigenvalues & Eigenvectors', 12, 'Seed baseline from diagnostic and prior practice'),
      ('Signal Classification', 46, 'Seed baseline from diagnostic and prior practice'),
      ('Convolution', 20, 'Seed baseline from diagnostic and prior practice'),
      ('Laplace Transform', 30, 'Seed baseline from diagnostic and prior practice')
  ) as v(subtopic_name, score, reason)
)
insert into public.subtopic_review_events (module_id, subtopic_id, student_id, outcome, event_source, note)
select s.module_id, s.subtopic_id, s.student_id, d.outcome, d.event_source, d.note
from targeted_subtopics s
join review_defs d on d.subtopic_name = s.subtopic_name
where not exists (
  select 1
  from public.subtopic_review_events e
  where e.subtopic_id = s.subtopic_id
    and e.note = d.note
);

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_subtopics as (
  select s.id as subtopic_id, s.module_id, s.name as subtopic_name, t.student_id
  from public.subtopics s
  join public.topics t on t.module_id = s.module_id
  join target_users u on u.id = t.student_id
),
mastery_defs as (
  select *
  from (
    values
      ('Vector Spaces', 35, 'Seed baseline from diagnostic and prior practice'),
      ('Matrix Multiplication', 28, 'Seed baseline from diagnostic and prior practice'),
      ('Eigenvalues & Eigenvectors', 12, 'Seed baseline from diagnostic and prior practice'),
      ('Signal Classification', 46, 'Seed baseline from diagnostic and prior practice'),
      ('Convolution', 20, 'Seed baseline from diagnostic and prior practice'),
      ('Laplace Transform', 30, 'Seed baseline from diagnostic and prior practice')
  ) as v(subtopic_name, score, reason)
)
insert into public.subtopic_mastery_history (module_id, subtopic_id, student_id, score, reason)
select s.module_id, s.subtopic_id, s.student_id, d.score, d.reason
from targeted_subtopics s
join mastery_defs d on d.subtopic_name = s.subtopic_name
where not exists (
  select 1
  from public.subtopic_mastery_history h
  where h.subtopic_id = s.subtopic_id
    and h.reason = d.reason
);

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_subtopics as (
  select s.id as subtopic_id, s.module_id, s.name as subtopic_name, t.student_id
  from public.subtopics s
  join public.topics t on t.module_id = s.module_id
  join target_users u on u.id = t.student_id
),
mistake_defs as (
  select *
  from (
    values
      ('Matrix Multiplication', 'high', 'Mixed up matrix dimension compatibility', 'Redo one dimension-check drill before solving another full question.'),
      ('Convolution', 'high', 'Still uncertain about overlap intervals', 'Practice one graphical convolution step by step before a timed attempt.'),
      ('Laplace Transform', 'medium', 'Partial fraction setup is not yet automatic', 'Do one worked example, then one closed-book inversion question.')
  ) as v(subtopic_name, severity, trigger, next_step)
)
insert into public.topic_mistake_records (module_id, student_id, subtopic_id, severity, trigger, next_step)
select s.module_id, s.student_id, s.subtopic_id, d.severity, d.trigger, d.next_step
from targeted_subtopics s
join mistake_defs d on d.subtopic_name = s.subtopic_name
where not exists (
  select 1
  from public.topic_mistake_records m
  where m.module_id = s.module_id
    and m.subtopic_id = s.subtopic_id
    and m.trigger = d.trigger
);

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_topics as (
  select t.module_id, t.student_id, t.name
  from public.topics t
  join target_users u on u.id = t.student_id
),
plan_defs as (
  select *
  from (
    values
      ('Linear Algebra', 'Clear overdue matrix review', 'Start with the most overdue weak spot before new content.', 25, 'review'),
      ('Linear Algebra', 'Rebuild eigenvalue intuition', 'Use one worked example and one short retrieval question.', 40, 'focus'),
      ('Signals and Systems', 'Clear convolution review', 'Review overlap intervals before attempting a new timed question.', 25, 'review'),
      ('Signals and Systems', 'Deadline prep', 'Shift time toward retrieval because the assessment is getting closer.', 45, 'deadline')
  ) as v(topic_name, title, reason, minutes, block_type)
)
insert into public.topic_weekly_plan_blocks (module_id, student_id, title, reason, minutes, block_type)
select t.module_id, t.student_id, d.title, d.reason, d.minutes, d.block_type
from targeted_topics t
join plan_defs d on d.topic_name = t.name
where not exists (
  select 1
  from public.topic_weekly_plan_blocks p
  where p.module_id = t.module_id
    and p.title = d.title
    and p.block_type = d.block_type
);

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_topics as (
  select t.module_id, t.student_id, t.name
  from public.topics t
  join target_users u on u.id = t.student_id
),
accountability_defs as (
  select *
  from (
    values
      ('Linear Algebra', 2, now() - interval '1 day', now() - interval '6 hours'),
      ('Signals and Systems', 3, now() - interval '2 days', now() - interval '4 hours')
  ) as v(topic_name, streak_days, last_nudge_at, last_check_in_at)
),
accountability_day_defs as (
  select *
  from (
    values
      ('Linear Algebra', current_date - 1),
      ('Linear Algebra', current_date),
      ('Signals and Systems', current_date - 2),
      ('Signals and Systems', current_date - 1),
      ('Signals and Systems', current_date)
  ) as v(topic_name, completed_on)
)
insert into public.topic_accountability_state (module_id, student_id, streak_days, last_nudge_at, last_check_in_at)
select t.module_id, t.student_id, d.streak_days, d.last_nudge_at, d.last_check_in_at
from targeted_topics t
join accountability_defs d on d.topic_name = t.name
on conflict (module_id) do update
set streak_days = excluded.streak_days,
    last_nudge_at = excluded.last_nudge_at,
    last_check_in_at = excluded.last_check_in_at;

with seed_config as (
  select null::text as target_email
),
target_users as (
  select au.id
  from auth.users au
  cross join seed_config cfg
  where cfg.target_email is null
     or lower(coalesce(au.email, '')) = lower(cfg.target_email)
),
targeted_topics as (
  select t.module_id, t.student_id, t.name
  from public.topics t
  join target_users u on u.id = t.student_id
),
accountability_day_defs as (
  select *
  from (
    values
      ('Linear Algebra', current_date - 1),
      ('Linear Algebra', current_date),
      ('Signals and Systems', current_date - 2),
      ('Signals and Systems', current_date - 1),
      ('Signals and Systems', current_date)
  ) as v(topic_name, completed_on)
)
insert into public.topic_accountability_days (module_id, student_id, completed_on)
select t.module_id, t.student_id, d.completed_on
from targeted_topics t
join accountability_day_defs d on d.topic_name = t.name
on conflict (module_id, completed_on) do nothing;
