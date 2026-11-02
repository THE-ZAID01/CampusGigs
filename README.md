# CampusGigs

A campus gig marketplace where students post tasks, bid on each other's work, and get paid safely through **escrow** using **GigCoins**.

Built for the SEA Lab micro project, following the blueprint: basic web functionality + one unique feature (escrow).

**Stack:** React 18 + Vite · Node.js + Express · PostgreSQL · JWT · bcryptjs

## What's inside

| Area | What it does |
|---|---|
| Login / Signup | Split-screen landing page. Remember me, forgot/reset password, `@ves.ac.in` email check, bcrypt-hashed passwords, JWT |
| Menu | 3-bar button opens and closes a side drawer: Dashboard, Profile, GigCoins, History, Log out |
| Dashboard | Explore gigs (search, category, sort), post a gig, place/update/withdraw bids, accept a bid, deliver, approve, ask for changes, leave a gig |
| Escrow (unique feature) | Accepting a bid locks that bid amount from the owner's wallet. The freelancer is paid only when the owner approves. If the freelancer leaves, the owner is refunded in full |
| Profile (trust ID) | Photo, name, headline, department, skills, bio, UPI. Shows level + XP (`Lv 1 · 100/1000`), gigs posted, gigs completed. Other students see it at `/u/:id` |
| GigCoins | Balance, coins in escrow, earnings today/week/month, daily/weekly/monthly chart, activity log, add coins and withdraw to UPI (both mocked) |
| History | Every gig you worked on or posted, filter by role and status, with payouts |

### The escrow story from the brief

1. Aarav posts a gig with a budget of **500**.
2. Two students bid **450** and **400**.
3. Aarav accepts **400**. Exactly 400 GigCoins move from his wallet into escrow (his balance drops by 400, not 500).
4. The freelancer delivers. Aarav approves. The 400 are released to the freelancer's wallet.
5. The freelancer withdraws to UPI whenever they like.

### XP and levels

Every level needs 1000 XP. Signup +100 · post a gig +50 · complete a gig as freelancer +250 · approve a delivery as owner +100.

## Setup (about 10 minutes)

### 1. Install the basics

- **Node.js 18+** (https://nodejs.org)
- **PostgreSQL 14+** — pick one:
  - Install it locally (https://www.postgresql.org/download/), **or**
  - Use Docker: `docker compose up -d` in this folder (creates user `postgres`, password `postgres`, database `campusgigs`), **or**
  - Use a free cloud database such as Neon (https://neon.tech) and copy its connection string.

### 2. Configure the server

```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
```

Open `server/.env` and set `DATABASE_URL` to match your Postgres, for example:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/campusgigs
JWT_SECRET=any-long-random-string
```

Other settings (all optional):

| Variable | Default | Meaning |
|---|---|---|
| `ALLOWED_DOMAINS` | `ves.ac.in` | Comma-separated email domains allowed to sign up. Add `gmail.com` while testing if you like |
| `SERVICE_FEE_PERCENT` | `0` | Cut kept by the platform on release. The blueprint suggests `5` |
| `SIGNUP_BONUS_COINS` | `500` | Free demo GigCoins for new accounts |
| `MIN_WITHDRAW_COINS` | `50` | Minimum UPI withdrawal |
| `DB_SSL` | `false` | Set `true` for Neon / Render / Supabase |

### 3. Install everything and create the database

From the project root:

```bash
npm run install:all
npm run db:setup
```

`db:setup` creates the database if it doesn't exist, creates the tables, and adds demo data. To wipe and start over later: `npm run db:reset`.

### 4. Run it

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api/health

(Or run `npm run dev` inside `server/` and `client/` in two terminals.)

### 5. Log in with demo accounts

Password for all: `demo1234`

| Email | Notes |
|---|---|
| `aarav@ves.ac.in` | Has finished gigs, one in progress, one delivered, and a posted gig |
| `meera@ves.ac.in` | Has an open gig with two competing bids (650 and 700 against an 800 budget) |
| `rohan@ves.ac.in`, `sana@ves.ac.in` | Other sides of the demo gigs |

## Demo script (2 minutes)

1. Log in as **meera**. Open **Posted by me**, then "Landing page in React for a club". Two bids are waiting.
2. Click **Accept and hold** on the lowest bid. The dialog shows her balance before and after. Confirm. The stepper moves to "Coins in escrow".
3. Log out, log in as **rohan**. Open **My work & bids**, open the gig, click **Mark as delivered**, add a link.
4. Log back in as **meera**, open the gig, click **Release payment**. XP goes up for both.
5. Log in as **rohan** again, open **GigCoins**: balance, earned today, chart, then **Withdraw to UPI**.
6. Open **History** to see the finished work.

## Automated API test

With the server running (`npm run dev`):

```bash
npm run test:flow
```

It registers throw-away users and runs 42 checks: bid rules, escrow hold, delivery, revision, release, no double release, refund when a freelancer leaves, insufficient funds, withdrawals, analytics and history.

## Run it as one server (production style)

```bash
npm run build      # builds client/dist
npm start          # Express serves the API and the built client on http://localhost:5000
```

For hosting (Render/Railway for the API, Neon for Postgres, Vercel for the client): set `VITE_API_URL` in `client/.env` to the API's URL before building the client, and set `CLIENT_ORIGIN` in the server environment to the client's URL.

## Project structure

```
campusgigs/
├── server/
│   ├── db/            schema.sql · seed.js · setup.js · flow-test.js
│   └── src/
│       ├── config/        env.js · db.js
│       ├── middleware/    auth.js · error.js
│       ├── routes/        index.js (all endpoints)
│       ├── controllers/   auth · user · gig · bid · escrow · wallet · history
│       └── services/      escrowService.js (state machine) · walletService.js · userService.js
└── client/src/
    ├── api/ context/ utils/ styles/
    ├── components/    AppShell (menu drawer) · TrustCard · StatusStepper · BarChart · …
    └── pages/         Login · Signup · Recover · Dashboard · GigDetail · Profile · PublicProfile · Wallet · History
```

## Escrow state machine

```
open ──accept bid (coins locked)──▶ in_progress ──deliver──▶ delivered ──approve──▶ completed
                                       ▲                         │
                                       └──── ask for changes ────┘
in_progress / delivered ──freelancer leaves──▶ open   (owner refunded in full)
open ──owner cancels──▶ cancelled
```

Each step runs in one database transaction with row locks, so coins can't be created, lost, or spent twice.

## API summary

All routes are under `/api`. Everything except `auth/*`, `meta` and `health` needs `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/register` · `/auth/login` · `/auth/forgot` · `/auth/reset` | Account access |
| GET / PUT | `/users/me` | Own profile + stats / update |
| GET | `/users/:id` | Public trust ID |
| GET / POST | `/gigs` | List (`scope=explore|posted|working`, `q`, `category`, `sort`) / create |
| GET / PUT / DELETE | `/gigs/:id` | Detail / edit open gig / cancel open gig |
| POST | `/gigs/:id/bids` | Place or update your bid |
| GET | `/bids/mine` | Your bids |
| DELETE | `/bids/:id` | Withdraw a pending bid |
| POST | `/bids/:id/accept` | Accept bid and lock coins in escrow |
| POST | `/gigs/:id/deliver` · `/revision` · `/confirm` · `/leave` | Escrow actions |
| GET | `/wallet` · `/wallet/analytics` · `/wallet/transactions` | Balance, charts, activity |
| POST | `/wallet/topup` · `/wallet/withdraw` | Mock UPI in / out |
| GET | `/history` | Past work (`role`, `status`) |

## Troubleshooting

- **"Could not connect to PostgreSQL"**: Postgres isn't running, or `DATABASE_URL` has the wrong password/port. With Docker, run `docker compose up -d` first.
- **"password authentication failed"**: fix the password in `DATABASE_URL`.
- **Signup says only `@ves.ac.in` emails are allowed**: add your domain to `ALLOWED_DOMAINS` in `server/.env` and restart the server.
- **Page loads but API calls fail**: the API must be running on port 5000 (the dev client proxies `/api` there).
- **Fonts look plain**: the app loads Bricolage Grotesque and DM Sans from Google Fonts, so it needs internet once.
- **Forgot password**: there's no email server, so the reset link appears on the page (and in the server console).

## Scope note for the report

Real payments, chat, ratings, notifications, an admin panel and email OTP are out of scope here and listed as future scope, as in the blueprint. GigCoin top-ups and withdrawals are mocked, and no real card or bank data is collected.
