# LifeOS Production Foundation v0.1

LifeOS is a privacy-first system for verified, source-linked personal information. The root application is the production foundation; the historical browser prototype remains unchanged in `prototype/` and is not part of the production architecture.

## Status

The first usable workflow now supports private medical-document upload, explicit field review, a user-confirmed medical record, and a source-linked life event. It does not perform OCR or AI extraction, provide medical interpretation, or offer financial advice. Broader budgeting, memories, and appointments will build on the same sourced `LifeEvent` foundation.

See [development setup](docs/development-setup.md), [production deployment](docs/production-deployment.md), [architecture](docs/architecture.md), and [security model](docs/security-model.md).

## Install on a phone

LifeOS is an installable Progressive Web App, so the same reviewed code and server-side privacy controls power desktop and mobile.

- iPhone/iPad: open the deployed HTTPS site in Safari, tap **Share**, then **Add to Home Screen**.
- Android: open the site in Chrome and choose **Install app** from the browser menu.

The installed app uses a standalone window and mobile bottom navigation. Personal pages, API responses, and documents are intentionally not cached for offline use; only the public offline screen and app icons are cached. Authentication and the configured PostgreSQL/private object-storage services still require a network connection.
