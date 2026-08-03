# LifeOS Foundation

This is the local-only LifeOS foundation. Version 0.2 introduces typed, versioned domain models and a browser-local repository while preserving data created by the original prototype.

## Repository layout

```text
.
├── src/
│   ├── domain/      # Typed models, factories, validation, and calculations
│   ├── storage/     # Repository contract, IndexedDB implementation, and migrations
│   └── main.ts      # Browser UI orchestration
├── tests/           # Domain and migration tests
├── docs/            # Product foundation and roadmap
├── index.html       # Application shell
└── styles.css       # Application styles
```

## Start it

From the repository root, install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Use the URL printed by Vite (normally `http://localhost:5173`).

Production build and checks:

```bash
npm test
npm run typecheck
npm run build
```

## Working features

- Source-attributed life-event timeline
- Medical document upload, manual review, explicit confirmation, and source-linked timeline events
- Separate medical-history view with a strict no-diagnosis boundary
- Retirement/SIP-style projection calculator
- Local document vault using IndexedDB
- JSON export for timeline and retirement settings
- Responsive desktop and mobile interface

## Local data migration

On first launch, valid v0.1 events, retirement settings, and vault metadata are copied into the versioned IndexedDB schema. The old `localStorage` keys are retained as a rollback copy and are no longer used by the application after migration.

Moving the source files to the repository root does not change the app origin or IndexedDB database name, so existing browser-local data remains available when served from the same URL.

## Privacy status

No information leaves the browser. This is still a prototype, not a production-secure vault. There is no encryption, login, backup, key recovery, consent ledger, audit log, or server security yet. Do not use it as the only copy of important documents.

Medical fields are manually transcribed and confirmed in this version. OCR and AI extraction are intentionally not implemented yet.

## Product principles

1. No silent data collection.
2. Every insight must identify its source.
3. Uncertain extraction requires user confirmation.
4. No medical diagnosis or guaranteed financial advice.
5. Users can export and delete their information.
