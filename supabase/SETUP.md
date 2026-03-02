# Supabase Setup (Schema + Seed + Secure RLS)

## 1) Enable Auth
In Supabase Dashboard:
- Go to Authentication -> Providers -> Email
- Enable `Email` provider (password login)
- (Optional) Disable email confirmation during local dev

## 2) Run schema
Open SQL Editor and run:
- `supabase/schema.sql`

This creates:
- `students` (linked 1:1 to `auth.users`)
- `topics` (owned by student)
- `subtopics` (belongs to topic)
- `concepts` (belongs to subtopic)

Also includes:
- FK relationships + indexes
- update timestamp triggers
- auto profile creation trigger on signup
- strict RLS policies (users can access only their own rows)

## 3) Run seed
In SQL Editor, run:
- `supabase/seed.sql`

This seeds default topics, subtopics, and concepts for existing users in `auth.users`.

## 4) Quick verify
Run this in SQL Editor while authenticated as a user:
```sql
select count(*) from public.topics;
select count(*) from public.subtopics;
select count(*) from public.concepts;
```

You should only see your own rows due to RLS.

## Notes for this app
- Existing frontend expects `topics` and `students`.
- `topics.module_id` is included for compatibility with older schema variants.
- App signup already inserts/upserts into `students`; schema also includes automatic profile trigger.
