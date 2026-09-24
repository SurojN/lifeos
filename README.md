# LifeOS Production Foundation v0.1

LifeOS is a privacy-first system for verified, source-linked personal information. The root application is the production foundation; the historical browser prototype remains unchanged in `prototype/` and is not part of the production architecture.

## Status

See the [2026-09-24 release review](docs/release-review-2026-09-24.md) for hardening changes, verification, and outstanding release gates. Permanent account erasure and the signed-in staging acceptance flow must be completed before treating this foundation as ready for sensitive production records.

The first usable workflow now supports private medical-document upload, explicit field review, a user-confirmed medical record, a source-linked life event, private in-page history search, correction/deletion of confirmed records, and a private Life Guide that answers from confirmed or user-entered facts. Optional one-time AI suggestions are available for JPEG and PNG sources only after explicit consent; manual review remains the default and works without AI. LifeOS does not diagnose, provide medical interpretation, or offer financial advice.

See [development setup](docs/development-setup.md), [production deployment](docs/production-deployment.md), [architecture](docs/architecture.md), [security model](docs/security-model.md), and the [commercial strategy](docs/commercial-strategy.md).

The [delivery roadmap](docs/roadmap.md) connects this foundation to appointment preparation, travel planning, and future actions that require user confirmation. The Appointments page now lets you select confirmed health records, add your own questions, and preview a plain-text brief before downloading it. Drafts stay in the current page; no AI or booking service receives them. Original documents remain in the private vault and are referenced by filename and ID in the brief.

Finance supports saved manual income and expenses, monthly budget allocations, and savings goals in NPR. Totals use integer paisa; savings plans show the remaining amount and monthly contribution needed under an explicit zero-interest assumption. Transactions and goal balances are separate user-entered records; the app does not infer bank balances or move savings automatically. Finance records use encrypted timeline metadata, owner-scoped mutations, and the existing export. They can be edited or removed from the active history in Finance; deletion currently follows the foundation's soft-deletion policy.

Trips, appointment plans, learning goals, and memories can be found, edited, and removed directly in their own sections. Entries may link a document from the private vault and also appear in the timeline. Linking a source does not independently verify an entry or confirm a booking.

Vercel builds now run `build:release`, which checks that all database migrations are applied before building. Follow the controlled backup and migration steps in [production deployment](docs/production-deployment.md) before publishing schema-dependent changes.

Documents can be uploaded privately from the Documents, Medical, Finance, and Travel sections. Each upload is assigned a LifeOS category, validated for type/size/checksum, quarantined after verification, and can be deleted by its owner. Confirmed medical records remain separate from their source documents, retain a direct tenant-safe relationship to their timeline event, and require explicit review. Search terms are filtered in the loaded page instead of being sent in URL query strings.

## Install on a phone

LifeOS is an installable Progressive Web App, so the same reviewed code and server-side privacy controls power desktop and mobile.

- iPhone/iPad: open the deployed HTTPS site in Safari, tap **Share**, then **Add to Home Screen**.
- Android: open the site in Chrome and choose **Install app** from the browser menu.

The installed app uses a standalone window and mobile bottom navigation. Personal pages, API responses, and documents are intentionally not cached for offline use; only the public offline screen and app icons are cached. Authentication and the configured PostgreSQL/private object-storage services still require a network connection.
