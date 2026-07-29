# Trim

Trim is a cost-management workspace for invoices, vendors, subscriptions, imports, reconciliation, usage records, and AI-assisted recommendations. It keeps decisions reviewable through recommendation approval, rejection, verification, implementation, and explanation endpoints.

## Stack and layout

Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Tailwind CSS, Zod, JWT/session utilities, PapaParse, and Vitest. Pages and API routes are in `src/app`; the Prisma schema and seed script are in `prisma`; tests live in `tests`.

## Local setup

```bash
cd 31_Trim
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Configure `DATABASE_URL`, `TEST_DATABASE_URL`, and a random `APP_SECRET`. `AI_PROVIDER=mock` enables local workflows without an external model key.

```bash
npm test
npm run test:coverage
npm run test:e2e
npm run lint
npm run build
```

The development server runs on port 3001 (`npm start` also uses 3001).
