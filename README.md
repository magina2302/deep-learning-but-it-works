# Gradify — AI Learning Assistant

Gradify is a module-based learning app built with React + Vite + Supabase.  
It helps students track mastery, chat with an AI tutor, upload study materials, and get recovery prompts for inactive modules.

## Features

- Authentication with Supabase (login/signup/logout)
- Module dashboard with progress, mastery, tags, and analytics
- Per-module AI chat experience with persisted chat history
- File upload flow with contextual study modes (quiz, teach, revise)
- Math-friendly markdown rendering (KaTeX support)
- Study plan recommendations per module
- Inactivity reminder flow (e.g., modules inactive for 5+ days)
- Theme support and polished UI animations

## Tech Stack

- React 18 + TypeScript
- Vite 6
- React Router 7
- Supabase (`@supabase/supabase-js`)
- Tailwind CSS + custom theme tokens
- Vitest for tests

## Project Structure

```text
src/
	app/
		components/     # UI + page components
		data/           # mock data, study plan utilities, tests
		routes.ts       # app routes
	styles/           # theme + global styles
	supabase.ts       # Supabase client config
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure Supabase

Update `src/supabase.ts` with your own project credentials:

- `supabaseUrl` = your Supabase Project URL
- `supabaseKey` = your Supabase anon/publishable key

If these values are incorrect or the project domain is unreachable, login/signup can fail with `Failed to fetch`.

### 3) Run the app

```bash
npm run dev
```

App runs on Vite default local URL (typically `http://localhost:5173`).

## Available Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run test` — run tests once
- `npm run test:watch` — run tests in watch mode

## Routing

- `/login` — login page
- `/signup` — signup page
- `/` — dashboard (protected)
- `/module/:moduleId` — module workspace (protected)

## Notes for GitHub Upload

- Ensure sensitive keys are not committed if you move to environment variables.
- Keep `node_modules/` out of version control.
- Add screenshots/GIFs in this README for better project presentation.

## Future Improvements

- Move Supabase config to `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Add deployment instructions (Vercel/Netlify)
- Add contribution guidelines and license

