# 🎅 Secret Santa

A private Secret Santa app for one group of friends: invite link, wishlists,
exclusions, a server-side draw, and an anonymous chat where each Santa can ask
their recipient a limited number of questions.

Built with Next.js, Supabase (database, login, realtime) and Tailwind CSS.

## How it works

- **Join:** friends open the invite link, create an account (email + password) and pick a display name.
  The **first person to join becomes the organizer**.
- **Wishlists:** everyone adds wishes (with optional link and note) and can browse everyone else's.
- **Exclusions:** the organizer marks pairs who shouldn't draw each other (both directions).
- **Draw:** the organizer clicks "Draw names". The server computes the pairs with the secret key,
  so the full list never reaches any browser, not even the organizer's.
- **Anonymous chat:** each Santa can ask their recipient up to 10 numbered questions
  (configurable). The recipient sees them as "Your Santa" and can answer as much as they like.
  Messages appear live.

Secrecy is enforced by the database (row level security), not just hidden in the UI:
each person can read only their own match. See [supabase/schema.sql](supabase/schema.sql).

> The owner of the Supabase project can still open the `assignments` table in the Supabase
> dashboard, so no peeking. 😉

## Setup

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project (free plan is fine).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. Open **Authentication → Sign In / Providers → Email** and switch **off** "Confirm email".
   (Supabase's built-in email service only sends a few emails per hour, which isn't enough for a group.)

### 2. Run it locally

```bash
cp .env.example .env.local   # then fill in the three values from Supabase → Project Settings → API Keys
npm install
npm run dev
```

Open http://localhost:3000. Sign up, then go to `/join` and enter the invite code. You can find it
in Supabase under **Table Editor → settings → invite_code**. After that, the **Organizer** page
shows the full invite link.

### 3. Deploy to Vercel

1. Push this folder to a new GitHub repository.
2. On [vercel.com](https://vercel.com) click **Add New → Project** and import the repository.
3. Add the three environment variables from `.env.local` and click **Deploy**.
4. In Supabase, open **Authentication → URL Configuration** and set **Site URL** to your Vercel URL.
5. Open your site, join first (so you become the organizer), and share the invite link from the
   **Organizer** page.

## Scripts

| Command         | What it does                        |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start the app locally               |
| `npm test`      | Run the draw algorithm tests        |
| `npm run lint`  | Check the code for problems         |
| `npm run build` | Build for production                |

## Project layout

```
supabase/schema.sql      Database tables, security rules and functions
src/lib/draw.ts          The draw algorithm (+ draw.test.ts)
src/lib/data.ts          Server-side data loading and auth helpers
src/app/page.tsx         Home: your match, countdown, members
src/app/login, join      Sign in / sign up and joining the group
src/app/wishlist         Your wishlist and everyone else's
src/app/chat             Anonymous Q&A with live updates
src/app/admin            Organizer: invite link, settings, exclusions, draw
src/app/globals.css      Theme colors (placeholder until we design the look)
```
