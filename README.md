# Pathfinder

Match people to life opportunities — starting with **funding, fellowships, and research** — from a single profile. The schema already covers all eight opportunity categories; ingestion and matching deepen category by category.

## Stack

- **Backend:** Django + Django REST Framework, SimpleJWT (access in JSON, refresh in httpOnly cookie)
- **Frontend:** React + Vite + Tailwind CSS + React Router

## Opportunity taxonomy

Eight categories (landscape research):

1. academic & educational  
2. employment & career  
3. research & innovation ← **current wedge**  
4. professional development  
5. experiential learning  
6. social impact  
7. entrepreneurship  
8. cultural & creative exchange  

Each opportunity also has an **intent** bucket: advancement · funding · knowledge · networking.

See [docs/PHASE2.md](docs/PHASE2.md) for the Opportunity Compass layers (ingestion, matching, Moves).

## Prerequisites

- Python 3.11+ (3.14 works)
- Node.js 20+

## Backend setup

```bash
cd backend
py -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or: cp .env.example .env
python manage.py migrate
python manage.py seed_opportunities
python manage.py ingest_from_config      # CSV research sample through normalize path
python manage.py normalize_opportunities # dedup + expiry
python manage.py runserver
```

Useful later: `recompute_matches`, `process_signals`.

API: http://127.0.0.1:8000/api/

Surface endpoints the UI uses: `/api/matches/`, `/api/moves/`.

Admin: http://127.0.0.1:8000/admin/ (`python manage.py createsuperuser`)

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret |
| `DJANGO_DEBUG` | `True` / `False` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (leave empty to disable Google sign-in) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins (default includes Vite) |

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Vite proxies `/api` to the Django server (`VITE_API_BASE=/api`).

## API notes

- `POST /api/profile/dust/` — Dust assistant: send `{ "message": "..." }`, get structured
  `{ reply, mode, suggestions }` where suggestions may include a full `profile_patch` (build)
  or incremental tags/types (edit). Never writes the profile; the client applies after confirm.
- `POST /api/profile/scout/` — legacy alias of Dust.
- Access JWT in memory; refresh via httpOnly cookie on `/api/`.

## Dust

Floating **Ask Dust** pill on authenticated screens. Describe yourself to build a profile from
scratch, or ask for incremental edits. Confirm with **Apply this** — Dust never saves on its own.

Create and edit share one screen: `/profile` (and `/onboarding/steps`), the same `ProfileScreen`.

## Flutter

The product brief targets Flutter for native mobile. The current shippable client is this React
web app (same API). A Flutter client can consume the same endpoints when you start Phase 4 mobile.
