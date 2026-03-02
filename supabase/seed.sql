-- Clean, idempotent seed for schema.sql (topics/subtopics/concepts)
-- Safe to run multiple times.

with target_users as (
  select id
  from auth.users
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
  select u.id, d.name, d.subtitle, d.tags, gen_random_uuid()
  from target_users u
  cross join topic_defs d
  on conflict (student_id, name) do update
    set subtitle = excluded.subtitle,
        tags = excluded.tags,
        updated_at = now()
  returning id, module_id, student_id, name
),
subtopic_defs as (
  select *
  from (
    values
      ('Linear Algebra', 'Vector Spaces', 35, 3, 2, false, 'medium'),
      ('Linear Algebra', 'Matrix Multiplication', 28, 5, 4, false, 'high'),
      ('Linear Algebra', 'Eigenvalues & Eigenvectors', 12, 4, 2, false, 'high'),
      ('Signals and Systems', 'Signal Classification', 46, 2, 2, false, 'medium'),
      ('Signals and Systems', 'Convolution', 20, 6, 4, false, 'high'),
      ('Signals and Systems', 'Laplace Transform', 30, 4, 3, false, 'medium')
  ) as v(topic_name, subtopic_name, mastery, mistake_count, attempts, completed, forgetting_risk)
),
subtopic_rows as (
  insert into public.subtopics (
    module_id,
    name,
    mastery,
    mistake_count,
    attempts,
    completed,
    forgetting_risk
  )
  select t.module_id,
         s.subtopic_name,
         s.mastery,
         s.mistake_count,
         s.attempts,
         s.completed,
         s.forgetting_risk
  from topic_rows t
  join subtopic_defs s on s.topic_name = t.name
  on conflict (module_id, name) do update
    set mastery = excluded.mastery,
        mistake_count = excluded.mistake_count,
        attempts = excluded.attempts,
        completed = excluded.completed,
        forgetting_risk = excluded.forgetting_risk,
        updated_at = now()
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
    position = excluded.position,
    updated_at = now();
