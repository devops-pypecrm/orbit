# Orbit

Simple, clean project management for one organization. Next.js 16 + Prisma + Postgres + Tailwind.

## Run locally
```bash
npm install
# .env needs DATABASE_URL (Postgres) and AUTH_SECRET (openssl rand -hex 32)
npx prisma migrate dev
npm run dev
```
Open http://localhost:3000 — first visit asks you to create the admin account. Admins add teammates on **Team**.

## Deploy to Vercel
1. Push this folder to GitHub, import it in Vercel.
2. Add a Postgres database: Vercel → Storage → Neon (sets `DATABASE_URL`). Use the pooled URL.
3. Add env var `AUTH_SECRET` (any long random string).
4. Deploy. `npm run build` applies migrations automatically.

## Features vs. Jira / ClickUp
See [FEATURES.md](FEATURES.md).
