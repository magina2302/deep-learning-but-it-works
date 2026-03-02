🎓 Gradify — AI Learning Assistant

Gradify is a module-based AI learning companion built with React + Vite + Supabase.
It helps students track mastery, chat with an AI tutor, upload study materials, and stay consistent with intelligent recovery prompts.

✨ Features

🔐 Authentication (Supabase)

Login / Signup / Logout

Protected routes

📊 Module Dashboard

Progress & mastery tracking

Tags & analytics

Clean, responsive UI

🤖 Per-Module AI Tutor

Context-aware AI chat per module

Persisted chat history

📂 Study Material Uploads

Smart study modes:

📝 Quiz Mode

👩‍🏫 Teach Mode

🔁 Revise Mode

📐 Math-Friendly Markdown

KaTeX rendering support

📅 Study Plan Recommendations

Module-based suggestions

⏳ Inactivity Recovery

Prompts for modules inactive 5+ days

🎨 Theme + Animations

Polished UI with smooth transitions

🛠 Tech Stack

React 18 + TypeScript

Vite 6

React Router 7

Supabase (@supabase/supabase-js)

Tailwind CSS + custom theme tokens

Vitest

📁 Project Structure
src/
  app/
    components/     # UI + page components
    data/           # mock data, study plan utilities, tests
    routes.ts       # app routes
  styles/           # theme + global styles
  supabase.ts       # Supabase client config
🚀 Getting Started
1️⃣ Install Dependencies
npm install
2️⃣ Configure Supabase

Update src/supabase.ts with your credentials:

supabaseUrl → Your Supabase Project URL

supabaseKey → Your Supabase anon/public key

If these values are incorrect, authentication may fail with:

Failed to fetch
3️⃣ Run the App
npm run dev

The app runs on Vite’s default local URL (usually http://localhost:5173).

🧭 Routing

/login → Login page

/signup → Signup page

/ → Dashboard (Protected)

/module/:moduleId → Module workspace (Protected)

📜 Available Scripts

npm run dev — Start development server

npm run build — Production build

npm run test — Run tests once

npm run test:watch — Watch mode

📌 Notes for GitHub

Do not commit sensitive keys.

Keep node_modules/ out of version control.

Add screenshots/GIFs for stronger project presentation.

🔮 Future Improvements

Move Supabase config to .env

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

Add deployment guide (Vercel / Netlify)

Add license + contribution guidelines
