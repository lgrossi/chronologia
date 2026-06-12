# Chronologia

Diário de Crohn — a calm, mobile-first PWA for tracking life with Crohn's disease
day to day: a fast daily check-in (mood + symptom waves + symptoms), a unified
timeline, health events, and gentle monthly trends framed for a doctor's visit.
UI copy is Brazilian Portuguese (pt-BR).

Built with Vite + React 18 + TypeScript + Tailwind, local-first storage via Dexie
(IndexedDB) behind a `Repository` seam, installable as a PWA.

## Develop

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build      # tsc -b && vite build
pnpm preview
```

Other scripts: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## BASE_PATH

The Vite `base` is read from `BASE_PATH` (default `/`). For GitHub Pages the
deploy workflow builds with `BASE_PATH=/chronologia/` so asset URLs resolve under
the project subpath. For local dev and root-hosted deployments leave it unset.

## Deployment

Production is GitHub Pages at https://lgrossi.github.io/chronologia/, deployed
automatically on push to `main` via `.github/workflows/deploy.yml`.
