# OBSI Hofer GmbH — Admin-Tool

Internes Tool für OBSI Hofer GmbH: Datenpflege und manuell freigegebener Dataverse-Sync. Ergänzt das separate [Kunden-Self-Service-Portal](../test-project) (read-only, eigenes Repo) um eine interne, schreibfähige Verwaltungsoberfläche.

Noch nicht initialisiert — starte mit `/init`, um Vision, Zielgruppe und Feature-Roadmap festzulegen.

## Tech Stack

| Bereich | Tool |
|---------|------|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Datenbank | Supabase (Postgres) |
| Validierung | Zod |
| Tests | Vitest (Unit/Integration), Playwright (E2E) |

Übernommen vom Kundenportal-Projekt: shadcn/ui-Komponenten, Design-System (`globals.css`), `.claude/`-Skills/Rules. Die eigentlichen Seiten/Business-Logik entstehen neu, passend zu den noch zu definierenden Features.

## Setup

1. `npm install`
2. `.env.local` anlegen (siehe `.env.local.example`)
3. `npm run dev` → [http://localhost:3000](http://localhost:3000)
4. Einmalig pro Maschine: `npx playwright install chromium`

## Entwicklungsworkflow

```
/init                 Projekt initialisieren (PRD + Feature-Map)
/write-spec PROJ-X     Feature-Spezifikation schreiben
/architecture          Technisches Design festlegen
/frontend              UI bauen (shadcn/ui)
/backend               APIs, Datenbank, Dataverse-Anbindung
/qa                     Gegen Acceptance Criteria testen + Security-Audit
/deploy                 Auf Vercel deployen
```

Details zu Konventionen stehen in [`CLAUDE.md`](CLAUDE.md).
