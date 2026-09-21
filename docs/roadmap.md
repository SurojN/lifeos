# LifeOS roadmap

LifeOS should help a person keep evidence, understand their own history, prepare for important moments, and eventually carry out selected tasks with permission. The path is **remember → understand → prepare → act**. A reliable health workflow is the first proof; appointments, travel, finance, and learning build on the same user-owned records.

This roadmap describes implementation order and completion criteria, not delivery-date promises. Finish and validate one useful workflow before expanding the number of domains or integrations.

## What the repository already contains

The root application already has these foundations. They were not all introduced by the current milestone, and implementation in code does not establish operational readiness.

| Capability | Current behavior and boundary |
| --- | --- |
| Private source documents | Categorized PDF, JPEG, and PNG uploads; authenticated downloads; filename encryption and private object storage. Upload confirmation checks size/checksum and leaves objects quarantined. See the release gates below. |
| Reviewed health history | Manual review creates a user-confirmed medical record and linked timeline event. Medicines can be copied from the source; corrections update the record and event together. Deletion currently retains soft-deleted metadata. |
| Optional AI extraction | Explicitly consented JPEG/PNG extraction is available when server settings are configured. Suggestions need human review. PDF review remains manual. |
| Search and Life Guide | Medical and timeline filters run in the loaded page. The Life Guide matches keywords, categories, and dates in saved facts; it is not a general conversational AI or a medical advisor. |
| Appointments, trips, and other events | Forms save user-entered plans, memories, and goals to the timeline. An appointment entry is not a confirmed clinic booking; a trip entry does not reserve transport or accommodation. |
| Export | A JSON download includes active records, document metadata, timeline events, and consent history. Original files are downloaded individually. This is not a complete backup or a restore workflow. |

See [architecture](architecture.md), [development setup](development-setup.md), and [security model](security-model.md) for the existing implementation.

## Phase 1 — Complete a useful health-to-appointment workflow

**Current milestone:** make document review reliable and help a user prepare for a visit from facts they selected.

- Keep the review draft tied to one source. A newly uploaded source becomes selectable immediately; changing sources clears the old fields, suggestions, and consent. Requests lock the form, delayed responses cannot populate another source, and failed saves preserve manual edits.
- Let the user select confirmed medical records, add their own visit purpose and questions, preview an appointment brief, and download it as text. Generate the brief inside the loaded page; select no records automatically.
- Include provenance and source references. Describe listed medicines as historical source information, without claiming they are currently taken. Show when an original is unavailable.
- Keep the brief draft temporary unless the user downloads it. Downloading a brief does not book an appointment, contact a clinician, share the original documents, or invoke AI.

**Complete when:** a user can upload a source, review it, save a record, find its linked timeline event, correct a detail, and prepare a brief containing exactly the records they selected. Source changes and failed requests must preserve these guarantees. Empty states, keyboard use, mobile layout, and missing originals must behave clearly. Unit checks and synthetic browser tests support development; the configured environment must also pass the end-to-end release checks below.

### First-week acceptance scenario

Use synthetic prescriptions and reports during development; do not upload someone's real medical data just to test the system. These are initial acceptance tasks, not a promise that production launch takes one week.

1. Start with no records and upload a synthetic prescription. Confirm that the source is available in the review selector without reloading the whole app.
2. Enter facts from source A, then select source B. Confirm that A's fields and any AI consent are cleared. Force a save failure and confirm that the current draft remains editable.
3. Save B's reviewed facts. Find the resulting medical record and timeline event, download the exact original, and correct a detail. Confirm that the timeline shows the correction.
4. Search for a saved medicine or provider. Check the returned source; an unknown fact must not produce an invented answer.
5. In Appointments, select only B, write a question, and inspect the brief before downloading. Confirm that A is absent, source references are present, and no request sends the brief to a third party.
6. Save an appointment date and verify it appears as a user-entered plan. Confirm that the interface never calls it a clinic-confirmed booking.
7. Repeat authorization checks with a second synthetic user. Verify that direct record and document URLs cannot expose the first user's information.

## Release gates before trusting the foundation with real records

These gates apply across phases. New planning or AI features do not remove them.

| Gate | Current gap | Required evidence |
| --- | --- | --- |
| Pending-upload deletion and cleanup | `DocumentUploadService.delete` skips object deletion while the document is `PENDING_UPLOAD`. A PUT may already have succeeded even if confirmation failed. Deletion also leaves the upload authorization active; confirmation does not require an undeleted source. A signed PUT can remain usable until its expiry. | Test deletion after PUT/before confirmation, retries, expiry, and concurrent confirmation. Invalidate applicable authorization, reject confirmation of deleted sources, and verify cleanup of objects uploaded late or abandoned. |
| Content validation and quarantine | The implemented workflow leaves uploads `QUARANTINED`, while owner downloads, medical confirmation, and optional extraction accept that status. MIME declarations and checksum checks do not establish that the content is safe. No scanner currently moves objects to `AVAILABLE` or `REJECTED`. | Implement and test content/malware validation and the intended quarantine access policy. Align UI and documentation with actual behavior; do not describe quarantined objects as inaccessible while routes serve them. |
| Permanent deletion | Source deletion removes the accessible object in the normal completed-upload path and soft-deletes metadata. Medical deletion also soft-deletes records/events. Whole-account erasure is explicitly unavailable in Privacy settings. | Provide a verified owner-controlled deletion workflow covering objects, source metadata, medical records, timeline events, extraction artifacts, and associated personal data. Define backup and minimal audit retention, surface any remaining retention honestly, and test retries and recovery from partial failures. |
| Complete export and recovery | The current JSON export excludes original bytes and extraction-job results. Deleted items are excluded; there is no import/restore flow. | Document what the export contains and omits. Provide a portable collection of originals and appropriate owned artifacts with a manifest, and test relationships/checksums and restoration before promising complete backup or recovery. |
| Unicode source retrieval | Download headers currently interpolate the original filename directly; Nepali and other non-Latin filenames need safe encoding. | Test Nepali filenames and malformed header characters with an ASCII fallback and a correctly encoded filename parameter. |
| Configured-environment verification | Type checks, builds, unit tests, and synthetic browser fixtures cannot prove Clerk, PostgreSQL, private storage, encryption keys, and deployed settings work together. | On isolated test infrastructure, verify sign-in, migrations, upload/confirmation, download, medical confirmation/correction, export, deletion, and two-user isolation. Check storage CORS/private access, required encryption configuration, and backup restoration. Record which checks ran and which remain blocked. |

## Phase 2 — Make the personal history easier to use

Reduce repeated entry while preserving the reviewed-fact contract. Improve question matching, dates, record/source links, and handling of conflicting or missing facts. Support papers and important life events through the existing document/event foundation instead of creating unrelated databases for each screen.

AI may help read a document or phrase an answer only after the user understands and consents to the data sent. Retain manual entry and local page search. Validate every AI-returned source identifier against the current user's authorized records; distinguish AI suggestions, user-entered facts, user-confirmed facts, and calculations. “User confirmed” must never imply independent clinical verification.

**Complete when:** agreed factual questions return the correct records and exact source links, missing evidence produces an honest no-answer state, and conflicting dates or details remain visible. Authorization, citation accuracy, correction propagation, deletion, and provider-failure tests pass. The workflow remains usable without AI, and unsupported questions do not turn into diagnosis or treatment advice.

## Phase 3 — Turn records into practical plans

Expand appointment preparation into explicitly chosen checklists and reminders. Develop travel planning around routes, lodging options, estimated costs, contact details, and the user's own reservation documents. Add external information only with visible sources, timestamps, and clear uncertainty about changing conditions. Keep user-entered estimates distinct from a provider's current quote.

Manual planning must remain useful in Nepal when hospitals, banks, wallets, transport operators, or public agencies provide no suitable API. Support photos, PDFs, copied details, and human confirmation. Evaluate English/Nepali labels, dates, lower-bandwidth use, and smaller screens with users. Do not enable background microphone/camera collection or unsolicited notifications.

**Complete when:** a user can prepare, edit, export, and delete a practical appointment or trip plan; inspect the evidence and age of any external information; and recognize every unconfirmed reservation. Reminders are opt-in and reversible. The plan still works if a provider integration is unavailable.

## Phase 4 — Add narrowly scoped, confirmed actions

Introduce one external action at a time, beginning with a provider that can support the full workflow. Candidate actions include requesting an appointment or placing a travel reservation. Institutional integrations are optional adapters, not prerequisites for organizing a life.

Before an external action, show the exact recipient/provider, requested time or itinerary, information to be shared, current price if relevant, and applicable cancellation details. Require explicit confirmation of that concrete action. A material change in details requires a fresh confirmation. Keep a clear distinction between a draft, a submitted request, and an externally confirmed booking.

Store minimal action receipts and status references. Handle retries without duplicate bookings, ambiguous timeouts without invented success, and provider cancellation or failure visibly. Never give a broad assistant unrestricted access to documents or accounts.

**Complete when:** one provider workflow passes preview, consent, submission, receipt verification, failure, retry, and cancellation tests; only authorized fields leave LifeOS; and manual completion remains available. A booking is shown as confirmed only when the provider supplies verifiable confirmation. Payments or money movement require a separately scoped product decision and are outside this milestone.

## Phase 5 — Extend the same foundation to finance and learning

Develop finance from user-owned income, savings, debt, investment, and goal information. Explain calculations with visible inputs, inflation, expected return, contribution changes, and time horizons. Keep projections separate from guarantees. Do not execute trades, move money, predict stocks, or introduce personalized regulated investment advice in the MVP.

Develop learning around chosen goals, evidence of progress, useful resources, and a manageable next step. Avoid engagement mechanics that reward time in the app over the user's actual goal. Broader family or delegated access needs its own consent, narrow permissions, expiry/revocation, and isolation tests before release.

**Complete when:** calculations have tested transformations and reproducible assumptions; users can correct, export, and delete their inputs; learning plans remain editable and optional; and each new domain can demonstrate a useful completed task without weakening source tracing or privacy.

## How to choose the next change

Prefer work that helps a user finish an important real task: find a source, correct a fact, prepare for a visit, understand a plan, or control their data. Collect feedback through voluntary observation and explicit user input; do not silently add analytics. Keep changes reviewable and report both verification results and operational limitations. Expand only when the previous phase's completion criteria have been demonstrated.
