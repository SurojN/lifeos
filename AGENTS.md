# LifeOS — Codex Project Context

## Product vision

LifeOS is a privacy-first personal operating system that helps a person organize, understand, and improve important areas of life over many years.

The long-term vision includes:

- personal medical history and prescription records
- retirement, savings, SIP, and financial-goal planning
- travel planning with routes, road conditions, lodging, costs, and safety information
- personal documents and life-event history
- learning and goal planning
- optional future integrations with banks, wallets, hospitals, insurers, and government systems

LifeOS must begin with a strong user-owned foundation before attempting institutional integrations.

## Core principle

LifeOS assists decisions; it does not replace professional judgment.

Every important statement produced from user data must be:

- traceable to its source
- clearly marked as verified, user-entered, calculated, or AI-inferred
- honest when confidence is low
- editable and deletable by the user

## Privacy rules

- Never enable continuous camera or microphone monitoring.
- Never collect data silently.
- Camera and microphone access must require a clear user action for a specific task.
- Prefer local-first processing and storage where practical.
- Users must be able to export and permanently delete their data.
- Do not send health or financial documents to third parties without explicit consent.
- Do not add analytics, trackers, advertising SDKs, or telemetry without an explicit product decision.
- Treat medical, financial, identity, and family information as highly sensitive.

## Current MVP purpose

The existing prototype is only a foundation. It currently demonstrates:

- a personal life-event timeline
- manually entered medical records
- retirement and recurring-investment projections
- a browser-local document vault
- local JSON export

The current weakness is excessive manual entry and disconnected features.

## First valuable workflow

Build one complete workflow before expanding:

1. User uploads a prescription or medical report.
2. The application stores the original document privately.
3. Important fields are extracted.
4. The user reviews and confirms every extracted field.
5. Confirmed information becomes a sourced medical timeline event.
6. The user can search and ask factual questions about their history.
7. Every answer links back to the exact source document.
8. The system must not diagnose, prescribe, or invent missing information.

AI extraction may be added later, but the data model and verification flow should work without depending on AI.

## Future finance workflow

- Record income, savings, investments, debts, and goals using user-owned data.
- Explain SIP and retirement scenarios in understandable language.
- Show assumptions including inflation, expected return, contribution growth, and retirement age.
- Clearly distinguish projections from guaranteed outcomes.
- Do not execute trades, move money, or provide personalized regulated investment advice in the MVP.

## Domain model direction

The central object is a `LifeEvent`.

A LifeEvent should support:

- id
- userId
- category
- title
- description
- occurredAt
- createdAt
- source type
- source document reference
- verification status
- confidence when machine-extracted
- structured metadata
- tags
- related events

Documents should remain separate source objects and may support:

- id
- ownerId
- filename
- MIME type
- size
- encrypted storage reference
- document category
- uploadedAt
- checksum
- extraction status
- retention/deletion state

## Initial categories

- health
- finance
- travel
- identity
- education
- career
- family
- property
- general

Do not build all category-specific features at once.

## Product behavior

LifeOS should feel calm and trustworthy.

Avoid:

- addictive engagement mechanics
- infinite scrolling
- unnecessary notifications
- fake certainty
- overwhelming dashboards
- making the AI the main product

Prefer:

- one clear next action
- visible sources
- simple language
- progressive disclosure
- explicit consent
- accessible interfaces
- useful empty states

## Nepal constraints

Assume initially that:

- banks and digital wallets may not provide personal-data APIs
- hospitals may use fragmented systems and may not integrate
- government partnerships will require evidence, trust, compliance, and proven public value
- many records will begin as photos, PDFs, printed reports, SMS messages, or manual entries
- connectivity and device quality may vary
- English and Nepali support may eventually be necessary

Do not make the MVP dependent on bank, wallet, hospital, or government integrations.

## Technical expectations

When modifying this repository:

- inspect the existing implementation before changing architecture
- make small, reviewable changes
- preserve user data during migrations
- add tests for calculations and data transformations
- validate file type and file size
- avoid logging sensitive user data
- never place secrets in client-side code
- document security limitations honestly
- run type checks, tests, and production builds before declaring work complete

## Current implementation priorities

1. Understand and document the current prototype.
2. Establish a maintainable project structure.
3. Define typed models for LifeEvent, SourceDocument, MedicalRecord, and FinancialGoal.
4. Connect medical events to their source documents.
5. Add document metadata and verification states.
6. Build the prescription/report review-and-confirm flow without AI first.
7. Add tests and a clear local-development setup.
8. Only then consider OCR or AI-assisted extraction.

## Non-goals for the current phase

- medical diagnosis
- treatment recommendations
- automatic banking access
- money movement
- stock predictions
- always-on surveillance
- selling user data
- government dashboards based on private user data
- broad AI agents with unrestricted access
- building every LifeOS domain simultaneously

## How Codex should work on this project

Before making a large change:

1. Read this file and the repository documentation.
2. Inspect relevant code and current behavior.
3. State assumptions and identify privacy or safety risks.
4. Propose the smallest coherent implementation.
5. Implement it with tests.
6. Report changed files, verification performed, and remaining limitations.

If a request conflicts with the privacy principles above, stop and call out the conflict rather than silently implementing it.
