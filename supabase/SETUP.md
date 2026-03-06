# Supabase Setup (Schema + Seed + Secure RLS)

## 1) Enable Auth
In Supabase Dashboard:
- Go to Authentication -> Providers -> Email
- Enable `Email` provider (password login)
- (Optional) Disable email confirmation during local dev

## 2) Run schema
Open SQL Editor and run:
- `supabase/schema.sql`

If this Supabase project already has older tables from a previous schema version, run this first:
- `supabase/migrate-live-db.sql`

This creates:
- `students` (linked 1:1 to `auth.users`)
- `topics` (owned by student)
- `subtopics` (belongs to topic)
- `concepts` (belongs to subtopic)
- evidence persistence tables for diagnostics, uploads, reviews, mistakes, plans, accountability, and grounded chat metadata

Also includes:
- FK relationships + indexes
- update timestamp triggers
- auto profile creation trigger on signup
- strict RLS policies (users can access only their own rows)

`schema.sql` is the required file for the current app.
The live frontend currently depends on `students` and `topics` directly.
`subtopics` and `concepts` are useful for demo data and future expansion, and the schema now also includes the durable tables needed to move diagnostics, review history, weekly plans, accountability, uploads, and trust metadata out of local storage.

## 3) Run seed
In SQL Editor, run:
- `supabase/seed.sql`

`seed.sql` is optional.

It now supports two modes:
- seed all existing auth users by leaving `target_email` as `null`
- seed one specific signed-up user by editing the `target_email` value near the top of the file

Important:
- if this is an older Supabase project, run `supabase/migrate-live-db.sql` before `schema.sql`
- run `schema.sql` first
- sign up at least one user before running `seed.sql`
- if you want demo data for only your own account, set `target_email` to your signup email before running the seed

## 4) Quick verify
Run this in SQL Editor while authenticated as a user:
```sql
select count(*) from public.topics;
select count(*) from public.subtopics;
select count(*) from public.concepts;
select count(*) from public.topic_diagnostics;
select count(*) from public.subtopic_review_events;
select count(*) from public.topic_weekly_plan_blocks;
select count(*) from public.topic_accountability_state;
```

You should only see your own rows due to RLS.

If you want to verify the seeded account selection more explicitly:

```sql
select id, email from auth.users order by created_at desc;
select id, email from public.students order by created_at desc;
select student_id, name from public.topics order by created_at asc;
```

## Notes for this app
- Existing frontend expects `topics` and `students`.
- `topics.module_id` is included for compatibility with older schema variants.
- App signup already inserts/upserts into `students`; schema also includes automatic profile trigger.
- For the app to work against Supabase, you need more than just these SQL files: Email auth must be enabled and the frontend must point at the correct Supabase project.
- `supabase/migrate-live-db.sql` is the safest path when the database already contains older tables like `modules`, `sessions`, or `subtopics.created_by`.
