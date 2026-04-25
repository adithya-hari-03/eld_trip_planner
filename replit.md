# ELD Trip Planner

## Overview

Full-stack ELD (Electronic Logging Device) Trip Planner. A driver enters their current location, pickup, dropoff and current cycle hours used; the app returns:

1. A map showing the route with pickup, dropoff, mandatory rest periods and fuel stops.
2. FMCSA-compliant Driver's Daily Log sheets (one per calendar day), drawn programmatically.

Built per assessment requirements: **React frontend + Django backend**, free map APIs (no API keys), property carrier on a 70 hr / 8 day cycle, no adverse driving conditions, fueling at least once every 1,000 miles, 1 hour combined for pickup and dropoff.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Frontend**: React 18 + Vite + TailwindCSS + shadcn/ui + react-leaflet + React Query (Orval-generated hooks)
- **Backend**: Django 5 + Django REST Framework + Gunicorn (prod)
- **Database**: PostgreSQL via `dj-database-url` + `psycopg2-binary` (Django ORM, JSONField for plan)
- **API codegen**: Orval generates React Query hooks + Zod schemas from `lib/api-spec/openapi.yaml`
- **Map**: OpenStreetMap tiles + Leaflet
- **Geocoding**: Nominatim (OpenStreetMap) — no key
- **Routing**: OSRM public demo server — no key
- **HOS planner**: custom Python implementation in `artifacts/api-server/trips/services.py`

## Artifacts

- `artifacts/trip-planner` — React frontend (path `/`)
- `artifacts/api-server` — Django backend (path `/api`)
- `artifacts/mockup-sandbox` — component preview sandbox (workspace tooling)

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/types after editing the OpenAPI spec
- `pnpm --filter @workspace/trip-planner run dev` — frontend dev server
- `cd artifacts/api-server && python manage.py runserver 0.0.0.0:8080` — backend dev server
- `cd artifacts/api-server && python manage.py migrate` — apply DB migrations

## API endpoints

- `GET /api/healthz`
- `POST /api/trips/plan` — body `{currentLocation, pickupLocation, dropoffLocation, currentCycleUsed}` → returns full trip plan (route, stops, daily logs)
- `GET /api/trips` — list saved trips
- `GET /api/trips/{id}` — fetch a saved trip
- `GET /api/trips/stats` — aggregate stats (total trips, miles, drive hours, fuel stops)

## HOS rules implemented

- 11 hr max driving
- 14 hr on-duty window
- 30 min break required after 8 cumulative hours of driving
- 10 hr off-duty reset between shifts
- 70 hr / 8 day cycle (with current cycle hours used as input)
- 34 hr restart when cycle would be exceeded
- 1 hr each for pickup and dropoff (on-duty not driving)
- Fuel stop every 1,000 miles
- Average speed assumed: 55 mph for HOS scheduling

## Theme

Vibrant dark cockpit theme: deep navy background with amber/orange accent gradients, color-coded stat tiles, glowing primary CTA, leaflet map, SVG-rendered FMCSA log grid.

## Exports

The trip details page exposes:
- **Print** — uses `window.print()` with `@media print` styles to print all daily logs.
- **Download PDF** — uses `jspdf` + `html2canvas-pro` to render each daily log card to a canvas and stitch them into a multi-page landscape Letter-size PDF, saved as `eld-logs-<id>.pdf`.
