# Commercial strategy

Last reviewed: 2026-09-15

## The product people should pay for

LifeOS should sell a recurring outcome, not access to a dashboard:

> “When an important life moment arrives, I can find the right facts, understand their source, and prepare my next step.”

The first paying audience should be families and caregivers in Nepal and the Nepali diaspora who manage fragmented prescriptions, reports, appointments, identity documents, and long-term plans. This is a focused launch hypothesis, not a claim that every user has the same needs.

The first paid wedge is a family health and life-admin vault:

- preserve original records and reviewed facts
- find an answer with its source in seconds
- prepare for an appointment or emergency
- track renewals, expiries, and important dates
- give another person narrow, revocable access when the owner chooses
- export or permanently delete everything

LifeOS must never sell personal data, place ads beside sensitive records, or make deletion/export a paid privilege.

## Trust gates before charging

Do not accept general paid subscriptions until the product can support its promises operationally:

- activate and verify permanent account-wide deletion, including stored objects and derived records
- add malware/content scanning before quarantined documents become available
- test database and private-object backup restoration, not only backup creation
- finish time-limited family access, revocation, and cross-user authorization tests
- implement the provider-neutral entitlement ledger and reconciled payment events
- publish plain-language terms, privacy information, refund handling, and a support path

A small, clearly described paid pilot may validate demand earlier, but pilot users must be told exactly which safeguards and capabilities are not yet available.

## Packaging hypotheses to validate

Pricing is an experiment until interviews and payment tests demonstrate willingness to pay.

| Plan | Intended value | Initial price hypothesis |
| --- | --- | --- |
| Free | One person, core health workflow, limited private sources, search, export, and deletion | NPR 0 |
| Plus | More storage, reminders, appointment preparation, document-expiry tracking, richer sourced answers | NPR 299/month or NPR 2,999/year |
| Family | Separate consented vaults for up to five people, emergency packs, delegated access, activity history | NPR 699/month or NPR 6,999/year |
| Assisted setup | A one-time, explicitly consented service for scanning and organizing old paper records | Quote per batch |

Start with annual or explicitly renewed payments. Do not advertise automatic recurring billing until a selected provider and merchant agreement confirm that exact capability.

## Payment architecture

Do not make the product dependent on Stripe. As of this review, Nepal is not on Stripe’s list of supported countries for businesses. Nepal Rastra Bank regulates payment systems and publishes the current list of licensed PSOs and PSPs. eSewa’s official merchant flow supports redirect-based payment, signed requests, callbacks/IPN, and server-side status verification.

Implementation should therefore use a provider-neutral billing boundary:

- `Plan`, `Entitlement`, `BillingCustomer`, `PaymentAttempt`, and `PaymentEvent` remain LifeOS-owned records.
- A payment adapter creates checkout and verifies provider callbacks.
- Webhooks are signature-verified, idempotent, and reconciled before an entitlement is granted.
- LifeOS never receives wallet credentials or card details.
- Refunds, failed renewals, grace periods, invoices, tax treatment, and deletion retention receive an explicit policy before launch.
- A Nepal launch should use an NRB-licensed provider after merchant onboarding; international billing requires a legally supported merchant setup.

Sources: [Nepal Rastra Bank Payment Systems Department](https://www.nrb.org.np/departments/psd/), [eSewa ePay merchant documentation](https://developer.esewa.com.np/pages/Epay-V2), [Stripe global availability](https://stripe.com/global).

## Helpful intelligence, not an unaccountable agent

LifeOS may use increasingly capable models, but capability does not remove the need for evidence, consent, or human control. The intelligence layer should follow this contract:

1. Retrieve only data the current user is authorized to access.
2. Distinguish user-entered, user-confirmed, calculated, externally verified, and AI-inferred information.
3. Cite the exact LifeOS record and source document behind every important claim.
4. Say “I do not know” when evidence is missing or conflicting.
5. Draft questions, checklists, comparisons, and plans; do not diagnose, prescribe, trade, transfer money, or impersonate the user.
6. Require a clear preview and confirmation before any external action.
7. Record consent, model/provider, relevant source IDs, and outcome without logging raw sensitive content.
8. Evaluate citation accuracy, authorization, refusal behavior, and deletion before enabling a model for real users.

The current private Life Guide is the safe first step: it answers from already-loaded confirmed or user-entered facts without sending the question or records to an external model. A future model may improve language and planning, but it must consume the same grounded fact contract and return source IDs that the server verifies.

## Twelve-week validation sequence

### Weeks 1–3: prove the painful job

- Interview at least 15 people across patients, caregivers, and diaspora families.
- Observe how they prepare for a real appointment or locate an old report.
- Measure time-to-source, failed searches, upload completion, and confirmation completion.
- Ask for a refundable annual-plan deposit rather than relying on compliments.

### Weeks 4–7: make it repeatedly useful

- Add owner-controlled reminders for appointments and document expiry.
- Build a printable/downloadable appointment brief with exact sources.
- Add a time-limited emergency sharing pack with explicit fields and revocation.
- Improve low-bandwidth behavior and begin English/Nepali content design.

### Weeks 8–10: test paid access

- Implement the provider-neutral entitlement and payment ledger.
- Integrate one licensed Nepal merchant checkout after approval.
- Offer annual Plus and Family pilots with a clear refund policy.
- Do not paywall export, deletion, consent history, or security controls.

### Weeks 11–12: decide with evidence

Continue only if testers repeatedly retrieve useful information, at least five complete a real payment or deposit, source-link accuracy remains effectively perfect, and no cross-user or deletion failures occur. Change the wedge if people upload data but do not return for appointment preparation, reminders, sharing, or answers.

## Product and trust metrics

Avoid engagement metrics that reward anxiety or compulsive use. Track:

- median time from question to exact source
- percentage of uploads that become reviewed records
- successful appointment/emergency preparation sessions
- reminder usefulness and opt-out rate
- family invitation acceptance and revocation success
- export and deletion completion rate
- sourced-answer citation accuracy
- paid conversion, renewal, refund, and support burden
- privacy, authorization, and data-loss incidents (target: zero)

## Legal and operational gate

The Privacy Act, 2075 is published by the Nepal Law Commission and should be reviewed with qualified Nepal counsel before handling production medical, identity, or family data. Payment, tax, consumer-protection, health-data, breach-response, and cross-border processing obligations also require professional review before public launch.

Source: [Nepal Law Commission — Privacy Act, 2075](https://lawcommission.gov.np/content/12261/the-privacy-act-2075/).
