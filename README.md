# Gradify

Gradify is an AI study coach for university-style modules. It helps students turn notes, past papers, and screenshots into a structured review workflow instead of a generic chatbot conversation.

The current app focuses on evidence-based learning: uploaded material becomes subtopics, review outcomes affect mastery, the dashboard surfaces what is due today, and the tutor can switch between coach, oral quiz, roleplay, and interview modes.

## What It Does

- Creates modules with goals, deadlines, weak areas, and a weekly study budget
- Extracts subtopics from uploaded notes, PDFs, pasted text, and supported image inputs
- Runs an AI tutor with citations and confidence labels when source material is available
- Lets learners generate subtopics directly from uploaded material and turn them into a guided study path
- Supports quick quiz interactions with clickable MCQ options and recovery-style check-ins after inactivity
- Tracks due reviews and updates mastery from explicit outcomes like `mastered`, `struggled`, and `missed`
- Generates weekly plans, next actions, and mistake review history
- Supports voice input/output and multiple tutoring session styles
- Uses Supabase authentication for login and signup

## Why It Stands Out

- Moves beyond chatbot-style tutoring by turning raw study material into structured learning actions
- Connects ingestion, tutoring, quizzes, review scheduling, and mastery into one loop
- Persists meaningful learning evidence so the product improves its guidance over time
- Ships with an MCP-style document tooling layer for contextualizing uploaded material before tutoring

## Core Product Areas

### Dashboard

- Module overview with mastery and progress
- Due-today review queue
- Coach notes and next actions across modules

### Module Workspace

- AI tutor chat with persisted history
- Upload, paste, and clipboard-driven study material ingestion
- Subtopic generation from uploaded study material
- Multiple tutor modes including coach, interview, and roleplay
- Quick quiz interactions with clickable MCQ choices
- Review controls for scheduled subtopics
- Confidence badges and source citations on AI responses

### Metrics

- Evidence-based mastery breakdown
- Weekly plan and goal/deadline coaching
- Mistake history and weak spot tracking
- Shareable summary for a teacher or study partner

## Tech Stack

- React 18
- TypeScript
- Vite 6
- React Router 7
- Supabase
- Model Context Protocol style document tooling
- pdfjs-dist for PDF text extraction
- Tailwind CSS
- Framer Motion / Motion
- Vitest

## Architecture Snapshot

- `Dashboard`: cross-module overview, urgency cues, mastery visuals, and coach notes
- `Module workspace`: chat-first tutoring interface with uploads, review actions, and metrics side panel
- `Supabase`: authentication plus persistent module evidence such as chat metadata, nudges, check-ins, plan completion, and review history
- `Vite middleware`: local API endpoints for chat and material analysis during development
- `MCP document layer`: document extraction, topic extraction, contextualization, and summarization helpers used during upload flows

## Project Structure

```text
src/
	app/
		components/      UI and page components
		data/            learning logic, mock data, study planning, tests
		routes.ts        router configuration
	mcp/               document-context tools and client helpers
	styles/            theme and global styles
	supabase.ts        Supabase client setup
supabase/
	schema.sql         database schema
	seed.sql           seed data
docs/
	ASSESSMENT_REPORT.md
	JUDGES_ASSESSMENT_REPORT.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure credentials

Two services matter in local development:

1. Supabase auth/data
2. OpenAI-powered tutor/material analysis

#### Supabase

Right now the repo reads Supabase credentials directly from `src/supabase.ts`.

If you want to point the app at your own project, update:

- `supabaseUrl`
- `supabaseKey`

Recommended follow-up improvement: move these into Vite env vars instead of hardcoding them.

#### OpenAI

The Vite dev server uses `OPENAI_API_KEY` from the environment for:

- `/api/chat`
- `/api/materials/analyze`

Create a local `.env` file if you want the AI features enabled:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Without an API key, the UI still loads, but AI-backed chat/material analysis will not work correctly.

### 3. Start the app

```bash
npm run dev
```

Default local URL:

```text
http://localhost:5173
```

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run test` runs the Vitest suite once
- `npm run test:watch` runs tests in watch mode

## Routes

- `/login` login page
- `/signup` signup page
- `/` protected dashboard
- `/module/:moduleId` protected module workspace

## Important Implementation Notes

- Learning persistence is hybrid: core evidence such as nudges, check-ins, plan completion, review history, and chat metadata are persisted, while some persona-style preferences still remain local
- The tutor backend is implemented inside `vite.config.ts` as dev-server middleware
- PDF and image material processing flows depend on the OpenAI key being available for the AI-backed steps
- Uploaded material can be turned into subtopics and contextualized through the local MCP-style tool layer
- Existing seeded/demo modules are included to show the product behavior without full setup

## Current Gaps

- No real multi-user collaborative study sessions yet
- Long-term knowledge graph and stronger evidence citation UX are still limited
- New evidence logic needs broader automated test coverage
- Supabase config should be moved out of `src/supabase.ts`
- Production deployment docs are still missing

## Recommended Next Improvements

1. Move Supabase credentials to environment variables
2. Persist evidence and review history in Supabase instead of only local storage
3. Add tests for `src/app/data/learning-core.ts`
4. Add deployment instructions for Vercel or Netlify

