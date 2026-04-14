# 🎬 Movie Assistant

A full-stack movie recommendation app powered by the TMDB API. Discover movies, get personalized recommendations based on your watch history, and manage your watchlist.

## Features

- **Smart Discover** — Filter by genre, rating, year, language, and streaming provider
- **Personalized Recommendations** — Learns from your watch history to suggest movies you'll love
- **Search** — Find movies and discover an actor/director's full filmography
- **Watchlist** — Save movies for later
- **Watch History** — Track what you've seen (and hide them from recommendations)
- **User Auth** — Secure JWT-based registration and login

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Framer Motion, Recharts |
| **Backend** | Express 5, TypeScript, Zod validation |
| **Database** | PostgreSQL (via Prisma 7) |
| **Cache** | Redis (with in-memory fallback) |
| **API** | TMDB API v3 |
| **Auth** | JWT + bcrypt |

## Getting Started

### Prerequisites

- Node.js 18+
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)
- PostgreSQL database (or use [Supabase](https://supabase.com) free tier)
- Redis (optional — falls back to in-memory cache)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, TMDB_API_KEY, etc.
npm install
npx prisma migrate deploy
npm run dev
```

### Frontend Setup

```bash
cd frontend-next
cp .env.example .env.local
# Edit .env.local with your backend URL
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app proxies API requests to the backend on port 5000.

## Deployment

This app is configured for free deployment on:

- **Frontend** → [Vercel](https://vercel.com)
- **Backend** → [Render](https://render.com)
- **Database** → [Supabase](https://supabase.com) (PostgreSQL)
- **Cache** → [Upstash](https://upstash.com) (Redis)

See [`render.yaml`](render.yaml) for the Render Blueprint configuration.

## Project Structure

```
movie-assistant/
├── backend/
│   ├── prisma/schema.prisma    # Database schema
│   ├── src/
│   │   ├── config/             # Database & cache setup
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth & error handling
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business logic
│   │   ├── utils/              # Validators
│   │   └── server.ts           # Entry point
│   └── prisma.config.ts        # Prisma 7 config
├── frontend-next/
│   ├── api/client.ts           # API client
│   ├── app/                    # Next.js pages (App Router)
│   ├── components/             # React components
│   ├── context/                # Auth & Theme providers
│   ├── hooks/                  # Custom hooks
│   └── styles/                 # CSS
└── render.yaml                 # Render deploy blueprint
```

## License

ISC
