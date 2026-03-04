# Gradify Technical Assessment Report (Judge Review)

**Date:** March 3, 2026  
**Project:** Gradify (`deep-learning-but-it-works`)  
**Prepared For:** Evaluation/Judging Panel  

---

## Problem Statement

Students often struggle with continuity and personalization in self-study workflows. Typical issues include:

1. Loss of learning momentum after inactivity.
2. Limited feedback loops tailored to weak concepts.
3. Static study plans that do not adapt to mastery/mistakes.
4. Fragmented learning artifacts (notes, PDFs, question papers) not integrated into tutoring flow.

Gradify addresses these by combining:
- module-level progress tracking,
- adaptive tutoring prompts,
- upload-aware AI assistance,
- and per-module learning analytics.

---

## Methodology

This report is evidence-based and constrained to what is verifiable in the submitted code.

### Assessment method used

- **Static implementation review** of core files:
  - `src/app/components/AuthContext.tsx`
  - `src/app/components/ModulesContext.tsx`
  - `src/app/components/ChatPanel.tsx`
  - `src/app/components/Dashboard.tsx`
  - `src/app/components/MetricsPanel.tsx`
  - `src/app/components/MarkdownMessage.tsx`
  - `src/app/data/next-action.ts`
  - `src/app/data/study-plan.ts`
  - `vite.config.ts`
  - `src/app/routes.ts`
- **Execution checks**:
  - `npm run test`
  - `npm run build`
- **Consistency filter**:
  - Excluded claims not directly backed by code paths or command outcomes.

### Evidence policy

- “Implemented” means behavior is present in code and reachable by current flows.
- “Tested” means validated by an executed command in this workspace.
- “Observed limitation” means known gap in design, robustness, or deployment readiness.

---

## Learning Model Design

Gradify currently implements a **rule-based adaptive learning model** (not an ML-trained predictive model).

### Components of the learning model

1. **Next-action policy engine** (`src/app/data/next-action.ts`)
   - Inputs: days inactive, overall mastery, failed attempts, weak spot metadata.
   - Outputs: one of
     - `restart`
     - `full_recap`
     - `quick_recap`
     - `plateau_mode`
     - `loop_back_weak_spot`
     - `harder_problems`
     - `more_practice`
     - `continue`

2. **Chat adaptation layer** (`src/app/components/ChatPanel.tsx`, `vite.config.ts`)
   - Combines module state + persona profile + error-pattern heuristics + upload mode.
   - Shapes tutoring style and adaptive questioning at response time.

3. **Study plan generator** (`src/app/data/study-plan.ts`)
   - Uses mastery/mistake/attempt signals to prioritize subtopics.
   - Allocates time blocks and optional break segments.

### Design characterization

- Deterministic policy logic with transparent thresholds.
- Personalization is behavior-driven (state/rules), not model-trained.
- Decision explainability is high because outputs are rule traceable.

---

## Data Structuring

### Core domain structures

- **Auth user** (`AuthContext.tsx`): `id`, `username`, `email`
- **Module + subtopics** (from `mock-data` and context usage):
  - module metadata, mastery, status, timestamps, learning summary, error breakdown
  - subtopic mastery, attempts, mistakes, completion status
- **Chat payload contract** (`vite.config.ts` `ChatRequestBody`):
  - topic state, weak spot details, history, persona, upload metadata/content, adaptive flags
- **Decision types** (`next-action.ts`): typed state and typed decision output.

### Persistence strategy

1. **Supabase-backed persistence**
   - auth sessions/users
   - module rows (`topics`) fetched/inserted/deleted in `ModulesContext.tsx`
2. **LocalStorage-backed persistence**
   - chat history by user/module
   - persona settings by module
   - error-pattern aggregates by module
   - decision/recovery one-time flags
   - module progress snapshots (mastery + last studied)

### ID handling

- `ModulesContext.tsx` resolves module identity with `module_id` first and `id` fallback.
- Add operation writes `module_id` with generated UUID.
- Delete operation attempts canonical delete by `module_id`, then compatibility fallback to `id`.

---

## Adaptation Logic

### 1) Inactivity-driven adaptation

- `daysInactive >= 7` → `restart`
- `daysInactive >= 3` → `full_recap`
- `daysInactive >= 1` → `quick_recap`

(Defined in `decideNextAction` in `next-action.ts`.)

### 2) Struggle-driven adaptation

- `failedAttemptsOnCurrentConcept >= 3` → `plateau_mode`
- weak spot presence → `loop_back_weak_spot`

### 3) Mastery-driven adaptation

- `overallMastery >= 75` → `harder_problems`
- `overallMastery < 40` → `more_practice`
- else → `continue`

### 4) Persona-driven adaptation

In `ChatPanel.tsx`, persona controls include:
- explanation style (`step-by-step`, `conceptual`, `visual`, `exam-focused`)
- pace (`slow`, `normal`, `fast`)
- tone (`encouraging`, `direct`)
- question style (`short-answer`, `mcq`, `problem-solving`, `code`)

These settings are sent in `/api/chat` request and used in prompt construction (`vite.config.ts`).

### 5) Upload-mode adaptation

Supported user modes in chat send flow:
- `quiz`
- `teach`
- `revise`

Prompt behavior and response style are modified by `uploadMode` in `vite.config.ts`.

### 6) Error-pattern adaptation

Heuristic detection of user confusion types in `ChatPanel.tsx`:
- concept confusion
- notation confusion
- calculation error
- syntax issue
- uncertain reasoning

These patterns are counted and included in chat requests to guide response style.

---

## Implementation Details

### Frontend architecture

- React + TypeScript + Vite app.
- Route structure in `src/app/routes.ts`:
  - public: `/login`, `/signup`
  - protected (via `AuthGuard`): `/`, `/module/:moduleId`

### Authentication flow (`AuthContext.tsx`)

- Session restoration via `supabase.auth.getSession()`.
- Session subscription via `supabase.auth.onAuthStateChange()`.
- Login via `signInWithPassword`, signup via `signUp`.
- Student row insert/upsert into `students` table after signup.

### Module management (`ModulesContext.tsx`)

- Fetch user topics from Supabase.
- Create/delete module operations.
- Merge seeded demo modules (`createMockModuleWithHistory`, `createInactiveReminderModule`).
- Progress update API with bounded mastery values and status derivation.

### Chat + tutoring (`ChatPanel.tsx` + `vite.config.ts`)

- Message lifecycle with optimistic append + async AI response.
- `/api/chat` development middleware proxying to OpenAI chat endpoint.
- Guardrail-oriented system prompt for math formatting and groundedness.
- Optional adaptive question generation and stripping logic.

### Math/Markdown rendering (`MarkdownMessage.tsx`)

- `react-markdown` + `remark-math` + `rehype-katex` pipeline.
- Custom normalization function to reduce malformed math delimiters and latex token issues.

### Study planning (`study-plan.ts`, `MetricsPanel.tsx`)

- Deterministic ranking of subtopics by mastery/mistakes/attempts plus seed hash variation.
- Time allocation across focused study, quiz, recap, and optional break.
- Visual rendering and generation trigger in metrics panel.

---

## Testing Procedures

### Procedure 1: Unit tests

- **Command:** `npm run test`
- **Observed outcome:**
  - Test file: `src/app/data/next-action.test.ts`
  - Result: `1 passed`
  - Test count: `10/10 passed`

### Procedure 2: Production build validation

- **Command:** `npm run build`
- **Observed outcome:**
  - Build completed successfully.
  - Bundles generated under `dist/`.

### Procedure 3: Implementation coherence checks

- Manual cross-check between documented behavior and concrete code paths.
- Particular focus areas:
  - auth/session flow
   - adaptation thresholds
  - local persistence keys and lifecycle
  - route protection and recovery-quiz trigger path

---

## Results

### Functional results

1. Authentication and route guarding are implemented and wired.
2. Module dashboard and analytics views are functional with CRUD hooks.
3. Adaptive tutoring flow is implemented with rule-based decisioning.
4. Upload-assisted tutoring supports quiz/teach/revise modes.
5. Study-plan generation exists and is integrated into module metrics.
6. Markdown + KaTeX rendering is integrated with extra normalization logic.

### Verification results

- **Tests:** passed (`10/10` in current suite).
- **Build:** passed (`vite build` success).

---

## Observations

1. **Strong feature integration for an MVP+ scope**
   - The project combines learning analytics, tutoring, and persistence in a coherent UX.

2. **Adaptation logic is explicit and maintainable**
   - Rule thresholds are easy to inspect and evolve.

3. **State persistence is practical but mixed-source**
   - Supabase + localStorage hybrid works for continuity but adds synchronization complexity.

4. **AI behavior is heavily prompt-mediated**
   - Practical for fast iteration, but deterministic guarantees are limited by LLM behavior.

---

## Limitations

1. **No trained predictive model**
   - Adaptation is rule-based, not data-trained/personalized via ML pipelines.

2. **Hardcoded Supabase configuration**
   - `src/supabase.ts` stores URL/key directly; environment-based secrets are not yet enforced.

3. **Limited automated test coverage**
   - Current automated tests primarily validate next-action policy logic.
   - No end-to-end test suite is present for full auth → dashboard → module → chat flow.

4. **Operational robustness not fully validated**
   - No formal load/performance benchmarks.
   - No production observability/runbook documented in codebase.

5. **Evaluation constraints**
   - This report validates implementation-level evidence in code and local command execution, not production deployment behavior in cloud environments.

---

## Citations (IEEE format if used)

No external academic or third-party references were used to make implementation claims in this report.  
All claims are derived from direct inspection of the submitted code and local execution results.

(If required later, framework/library docs can be added in IEEE format as supplementary references.)

---

## Appendix: Commands Executed for Verification

```bash
npm run test
npm run build
```
