# Production deployment and credentials

LifeOS cannot use placeholder or local-development credentials in production. Provider credentials are created only after the owner signs in to each provider; they cannot be safely invented, committed, or sent through chat.

## Recommended production services

- Vercel for the Next.js application and encrypted environment variables.
- Clerk, installed through Vercel Marketplace, for authentication.
- Neon Postgres, installed through Vercel Marketplace, for structured records.
- A private AWS S3 bucket with Block Public Access and SSE-KMS for medical and identity documents.

The database and authentication integrations can automatically inject most variables. The S3 bucket remains separate because LifeOS requires private storage, checksum verification, server-generated keys, and KMS encryption.

## One-time owner setup

Install and authenticate the Vercel CLI, link this repository, and provision managed services:

```bash
npm install --global vercel
vercel login
vercel link
vercel integration add clerk
vercel integration add neon
vercel env pull .env.local --yes
```

The repository currently has no Vercel CLI or linked project, so these account-owned steps have not been executed automatically.

Create a private S3 bucket in a suitable region, enable Block Public Access, create a customer-managed KMS key, require TLS and SSE-KMS in the bucket policy, configure CORS only for the production LifeOS origin and `PUT`, and create a least-privilege server identity restricted to the LifeOS document prefix. Add its values from `.env.production.example` through Vercel Project → Settings → Environment Variables. Never place them in a tracked file.

Generate the application encryption key without printing or pasting it into source control:

```bash
printf 'v1:'; openssl rand -base64 32
```

Add the result as `APPLICATION_ENCRYPTION_KEY` in Vercel for Production. Keep a protected backup; losing it makes encrypted personal fields unreadable. Rotation requires keeping the old value in `APPLICATION_ENCRYPTION_PREVIOUS_KEYS` until data has been re-encrypted.

After the first deployment, create a Clerk webhook for `https://YOUR_DOMAIN/api/webhooks/clerk`, subscribe to user created/updated/deleted events, and add its signing secret as `CLERK_WEBHOOK_SECRET`.

## Deployment checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
vercel deploy --prod
```

Apply Prisma migrations to the production database as a controlled release step before directing traffic to schema-dependent code. `prisma.config.ts` uses `DATABASE_URL_UNPOOLED` for migrations when Neon provides it, while runtime traffic continues using pooled `DATABASE_URL`. Back up the database first and never use `prisma db push` against production.

## Optional integrations

Bank, wallet, hospital, insurer, government, calendar, maps, road-condition, lodging, and safety providers are not required for the core application. Add one only after confirming API availability, user consent, data retention, deletion, audit, and failure behavior. Never ask users to provide bank passwords or scrape private portals.
