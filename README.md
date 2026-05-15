# Nutribiotics Prescriptions API

NestJS API for the prescription management platform. It uses Prisma ORM with
PostgreSQL, JWT access and refresh tokens, role-based guards, Swagger
documentation, generated prescription PDFs, audit logs, and admin metrics.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- PostgreSQL 16 for local development.
- Docker and Docker Compose if running the full stack with containers.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create the local environment file:

```bash
cp .env.example .env
```

3. Update `DATABASE_URL` if your local PostgreSQL credentials differ from the
   example.

4. Generate the Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed the database:

```bash
npm run prisma:seed
```

6. Start the API in watch mode:

```bash
npm run start:dev
```

The local API runs on `http://localhost:3000` by default. If you want the local
frontend to use the same URL as Docker Compose, set `PORT=3001` in `.env` or set
the frontend `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:3000`.

## Docker Compose

From the parent workspace directory, copy the root `.env.example` to `.env` and
start the stack:

```bash
cd ..
cp .env.example .env
docker compose up --build
```

Docker Compose exposes:

- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`
- PostgreSQL: `localhost:5432`

If the backend container starts before dependencies are installed in the named
volume, run:

```bash
docker compose exec backend npm install
docker compose exec backend npm run prisma:generate
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

## Environment Variables

Create `.env` from `.env.example`.

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. | `postgresql://postgres:postgres@localhost:5432/prescriptions?schema=public` |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens. Use a long random value outside local development. | `change-me-access-secret` |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens. Use a different long random value. | `change-me-refresh-secret` |
| `JWT_ACCESS_TTL` | Access token lifetime. Supports `s`, `m`, `h`, and `d`. | `900s` |
| `JWT_REFRESH_TTL` | Refresh token lifetime. Supports `s`, `m`, `h`, and `d`. | `7d` |
| `EMAIL_PROVIDER` | Email provider adapter. Current implementation supports console delivery. | `console` |
| `EMAIL_FROM` | Sender address used by the email service. | `noreply@nutribiotics.local` |
| `APP_ORIGIN` | Frontend origin allowed by the API CORS config. | `http://localhost:3000` |
| `PORT` | HTTP port used by NestJS. | `3000` |

Tests use `.env.test.example` as reference. End-to-end tests expect
`DATABASE_URL_TEST` to point to a separate PostgreSQL database.

## Database Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

Use `npm run prisma:migrate -- --name <migration_name>` when creating a new
development migration. Use `npx prisma migrate deploy` in deployed or container
environments where migrations already exist.

## Seed Accounts

The seed creates one account for each role:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@test.com` | `admin123` |
| Doctor | `dr@test.com` | `dr123` |
| Patient | `patient@test.com` | `patient123` |

The seed also creates eight sample prescriptions with a mix of `pending` and
`consumed` states.

## API Documentation

Swagger UI is available at:

- Local backend: `http://localhost:3000/docs`
- Docker Compose backend: `http://localhost:3001/docs`

Authenticate with `POST /auth/login`, then authorize Swagger with the returned
bearer access token.

## Main Endpoints

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Public | Authenticate and return access and refresh tokens. |
| `POST` | `/auth/refresh` | Public | Rotate refresh token and return new tokens. |
| `GET` | `/auth/profile` | Authenticated | Return the current user profile. |
| `GET` | `/users` | Admin | List users with pagination and optional role filter. |
| `POST` | `/users` | Admin | Create admin, doctor, or patient user accounts. |
| `GET` | `/doctors` | Admin | List doctor profiles. |
| `GET` | `/patients` | Doctor, Admin | List patient profiles. |
| `POST` | `/prescriptions` | Doctor | Create a prescription with manual items. |
| `GET` | `/prescriptions` | Doctor | List prescriptions authored by the current doctor. |
| `GET` | `/prescriptions/:id` | Doctor, Patient | Get prescription detail when allowed. |
| `PUT` | `/prescriptions/:id/consume` | Patient | Mark an owned pending prescription as consumed. |
| `GET` | `/prescriptions/:id/pdf` | Doctor, Patient, Admin | Download a generated PDF. |
| `GET` | `/me/prescriptions` | Patient | List prescriptions owned by the current patient. |
| `GET` | `/admin/prescriptions` | Admin | List prescriptions across the platform. |
| `GET` | `/admin/metrics` | Admin | Return totals, status counts, daily series, and top doctors. |
| `GET` | `/admin/metrics/stream` | Admin | Server-sent events stream for live metrics. |
| `GET` | `/admin/audit-logs` | Admin | List audit entries such as prescription consumption. |

Common list query parameters include `page`, `limit`, `status`, `from`, `to`,
`order`, and `q` where supported. Admin prescription lists also support
`doctorId` and `patientId`.

## Technical Decisions

### Authentication

The API issues short-lived JWT access tokens and longer-lived refresh tokens.
Refresh tokens are rotated through `POST /auth/refresh`; only a SHA-256 hash of
the latest refresh token is stored on the user record. Access tokens include the
user id, email, and role. Protected endpoints use the global JWT guard.

For server-sent events, the JWT strategy also accepts an `access_token` query
parameter because native `EventSource` clients cannot set custom authorization
headers.

### RBAC

Role-based access uses a `@Roles(...)` decorator and a global roles guard.
Allowed roles are `admin`, `doctor`, and `patient`. Services still enforce
ownership rules for sensitive resources, so a doctor can only access authored
prescriptions and a patient can only access owned prescriptions.

### PDF Generation

Prescription PDFs are generated in the backend with `pdf-lib`. The renderer
builds the document from normalized prescription data, includes doctor and
patient details, item instructions, notes, a signature/license text block, and a
QR code generated from the prescription detail URL.

### Pagination and Filtering

Paginated endpoints use shared DTOs and helpers with defaults of `page=1` and
`limit=20`, capped at `limit=100`. Responses include `data`, `page`, `limit`,
`total`, and `totalPages`. Date filters are ISO-8601 strings and prescription
lists default to descending order. Text search covers prescription notes and
item names where `q` is supported.

### Audit and Notifications

When a patient consumes a prescription, the service updates the prescription and
writes an audit log in the same database transaction. Prescription creation also
invokes the email service. The current provider is `console`, which keeps local
delivery deterministic while preserving the integration point for a real
provider.

## Tests and Checks

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
npm audit --audit-level=high
```

End-to-end tests require a PostgreSQL database available through
`DATABASE_URL_TEST`.

## Deployment URLs

Deployment URLs are not available yet.

- API: pending
- Swagger: pending

## Reviewer Acceptance Checklist

- Login returns profile and role data through `/auth/profile`.
- Role guards and decorators protect admin, doctor, and patient routes.
- Doctors can create prescriptions with manually entered items.
- Patients only see their own prescriptions and can consume or download them.
- Admin metrics support date filters.
- Lists support pagination, filters, ordering, and search where applicable.
- Migrations and seed run without errors.
- This README includes the commands needed to run the API locally or with
  Docker Compose.
