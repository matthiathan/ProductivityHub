# Productivity Hub

Personal productivity dashboard for tasks, projects, recurring work, focus tracking, goals, notes, calendar, analytics, and website reminders.

## Production

- Canonical URL: https://productivityhub-73ig.onrender.com
- Render service: `productivityhub`
- Render service ID: `srv-datobmugekts73bkiung`
- Source repository: `matthiathan/ProductivityHub`
- Production branch: `main`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Auto-deploy: enabled from `main`

## Backend

- Supabase project: `Productivity Hub`
- Project ref: `jgxeburcrzfurjklbpmf`
- Region: `eu-central-1`
- Frontend uses the Supabase publishable key through Render environment variables. Never expose a Supabase secret/service-role key in the browser.

## Scheduled maintenance

Supabase `pg_cron` runs the Productivity Hub maintenance job every five minutes. It keeps recurring-task occurrences generated ahead and creates due, overdue, goal-deadline, and reminder notifications.

## Authentication

The application uses Supabase email/password authentication. Public sign-up is not exposed in the application. Password-reset redirects are generated from `window.location.origin`, so production reset links target the active site origin.

For production, Supabase Auth URL Configuration should use the canonical Render URL as the Site URL and allow the reset route for that origin.

## Rollback

The previous Concentrix application was preserved in `matthiathan/Concentrix` on branch:

`rollback/pre-productivity-hub-2026-09-29`

Do not delete that branch until the Productivity Hub production deployment has completed an extended acceptance period.

## Local development

Copy `.env.example` to `.env.local` and provide:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Then run:

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

Before major production changes, verify authentication, task CRUD, recurrence, focus tracking, goals, reminders, calendar, notes, analytics, and responsive navigation.
