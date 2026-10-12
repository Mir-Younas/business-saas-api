# Business SaaS API

A production-oriented, multi-tenant business management SaaS backend built with **NestJS**, **Prisma 7**, **PostgreSQL**, and **Docker**.

The project is designed for service-based businesses such as salons, clinics, tutors, consultants, and similar organizations that need to manage teams, branches, customers, services, schedules, and bookings.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Current Features](#current-features)
- [Architecture](#architecture)
- [Database Models](#database-models)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Prisma Setup](#prisma-setup)
- [Running Locally](#running-locally)
- [Docker](#docker)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Testing](#testing)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

The backend uses a multi-tenant architecture where a single user can belong to multiple organizations and can have a different role in each organization.

Example:

```text
User
├── Organization A → OWNER
├── Organization B → MANAGER
└── Organization C → STAFF
```

Platform-level roles and organization-level roles are intentionally separated.

### Platform roles

```text
USER
SUPER_ADMIN
```

### Organization roles

```text
OWNER
ADMIN
MANAGER
RECEPTIONIST
STAFF
```

---

## Tech Stack

### Core

- Node.js 22
- TypeScript
- NestJS 11
- Prisma 7
- PostgreSQL
- Neon PostgreSQL

### Authentication and Security

- Passport
- JWT
- Google OAuth 2.0
- bcrypt
- HttpOnly cookies
- class-validator
- class-transformer

### Communication

- Nodemailer
- SMTP

### Development and Deployment

- ESLint
- Prettier
- Jest
- Docker
- Multi-stage Docker builds

---

## Current Features

### Authentication

- Email/password signup
- Email verification
- Verification-email resend
- Login
- Logout
- Access-token authentication
- Refresh-token sessions
- HttpOnly authentication cookies
- Forgot-password flow
- Password reset
- Google OAuth
- Blocked-user protection
- Multi-device sessions

### Authentication token lifetimes

| Token | Lifetime |
|---|---:|
| Access token | 15 minutes |
| Refresh session | 7 days |
| Email verification token | 24 hours |
| Password reset token | 15 minutes |

Refresh tokens, email-verification tokens, and password-reset tokens are stored as **hashes**, not as raw tokens.

---

## Architecture

Current multi-tenant relationship:

```text
User
  │
  └── OrganizationMember
          │
          └── Organization
                  │
                  └── Branch
```

`OrganizationMember` connects a user to an organization and stores the user's role and membership status for that organization.

This allows the same account to have different permissions in different organizations.

---

## Database Models

The current Prisma schema contains:

```text
User
Session
EmailVerificationToken
PasswordResetToken
Organization
OrganizationMember
Branch
```

Prisma migrations are committed under:

```text
prisma/migrations/
```

The generated Prisma client is created under:

```text
src/generated/prisma/
```

Generated Prisma files are **not committed to Git** and should not be edited manually.

---

## Project Structure

```text
business-saas-api/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   ├── auth/
│   │   ├── constants/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── utils/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── auth.types.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   └── utils/
│   │
│   ├── email/
│   │   ├── templates/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── email.module.ts
│   │   └── email.service.ts
│   │
│   ├── generated/
│   │   └── prisma/
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   └── jest-e2e.json
│
├── .dockerignore
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierrc
├── Dockerfile
├── README.md
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── package-lock.json
├── prisma7.config.ts
├── tsconfig.build.json
└── tsconfig.json
```

---

## Prerequisites

Required runtime versions:

```text
Node.js >= 22.14.0
npm >= 10.9.2
```

Check installed versions:

```bash
node -v
npm -v
```

If you use NVM:

```bash
nvm use 22
```

The required Node.js and npm versions are also declared in `package.json`.

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
```

Enter the project:

```bash
cd business-saas-api
```

Install dependencies:

```bash
npm install
```

Create your environment file:

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Linux/macOS

```bash
cp .env.example .env
```

Then fill in the required values.

---

## Environment Variables

The application reads configuration from `.env`.

Do not commit the real `.env` file. Only `.env.example` should be committed.

### Application

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | API port | `8080` |
| `APP_NAME` | Application name used by services such as email | `Business SaaS` |
| `API_URL` | Backend base URL | `http://localhost:8080` |
| `CLIENT_URL` | Frontend application URL | `http://localhost:3000` |

### PostgreSQL

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://username:password@host:5432/database` |

For Neon, use the PostgreSQL connection string provided by the Neon dashboard.

### Authentication

| Variable | Description |
|---|---|
| `JWT_ACCESS_SECRET` | Secret used to sign JWT access tokens |
| `REFRESH_TOKEN_HASH_SECRET` | Secret used to hash refresh tokens |
| `EMAIL_VERIFICATION_TOKEN_HASH_SECRET` | Secret used to hash email-verification tokens |
| `PASSWORD_RESET_TOKEN_HASH_SECRET` | Secret used to hash password-reset tokens |

Generate secure secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run the command separately for each secret so every value is different.

### Google OAuth

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `your-google-client-secret` |

For local development, the Google callback URL is:

```text
http://localhost:8080/auth/google/callback
```

### SMTP

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP account username/email | `example@gmail.com` |
| `SMTP_PASS` | SMTP password or app password | `your-app-password` |
| `SMTP_FROM` | Sender shown in outgoing emails | `Business SaaS <example@gmail.com>` |

### Complete `.env` example

```env
# --------------------------------------------------
# Application
# --------------------------------------------------
NODE_ENV=development
PORT=8080
APP_NAME=Business SaaS
API_URL=http://localhost:8080
CLIENT_URL=http://localhost:3000

# --------------------------------------------------
# PostgreSQL
# --------------------------------------------------
DATABASE_URL=postgresql://username:password@host:5432/database

# --------------------------------------------------
# Authentication
# --------------------------------------------------
JWT_ACCESS_SECRET=replace-with-a-secure-random-secret
REFRESH_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret
EMAIL_VERIFICATION_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret
PASSWORD_RESET_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret

# --------------------------------------------------
# Google OAuth
# --------------------------------------------------
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# --------------------------------------------------
# SMTP
# --------------------------------------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=example@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Business SaaS <example@gmail.com>
```

---

## Prisma Setup

The project uses Prisma 7 with PostgreSQL.

### Prisma schema

```text
prisma/schema.prisma
```

### Generated Prisma client

```text
src/generated/prisma/
```

### NestJS Prisma integration

```text
src/prisma/
```

The Prisma schema is the source of truth for generated Prisma types, model delegates, enums, and database migrations.

### Generate Prisma Client

The generated Prisma client is not committed to Git.

After cloning the repository, run:

```bash
npx prisma generate
```

Run the same command again whenever `prisma/schema.prisma` changes:

```bash
npx prisma generate
```

This generates:

```text
src/generated/prisma/
```

Do not manually edit files inside this directory.

### Create Development Migrations

When the Prisma schema changes during development:

```bash
npx prisma migrate dev --name migration_name
```

Example:

```bash
npx prisma migrate dev --name add_auth_foundation
```

This:

```text
reads prisma/schema.prisma
        ↓
creates a migration
        ↓
stores it in prisma/migrations/
        ↓
applies it to the development database
```

Migration files should be committed to Git.

### Apply Existing Migrations

To apply migrations that already exist in `prisma/migrations/` without creating new migrations:

```bash
npx prisma migrate deploy
```

This is the command used for deployment and production environments.

It:

```text
reads committed migrations
        ↓
checks which migrations are missing
        ↓
applies missing migrations
        ↓
does not create new migration files
```

### Prisma: Local vs Docker

Local development:

```text
npm install
    ↓
npx prisma generate
    ↓
npx prisma migrate dev
    ↓
npm run start:dev
```

Docker build:

```text
npm ci
    ↓
npx prisma generate
    ↓
npm run build
```

Docker container startup:

```text
npx prisma migrate deploy
        ↓
start NestJS API
```

When using Docker, Prisma client generation and migration deployment are handled automatically.

---

## Running Locally

Generate the Prisma client:

```bash
npx prisma generate
```

Apply development migrations:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run start:dev
```

The API runs at:

```text
http://localhost:8080
```

---

## Docker

The project includes a production-oriented multi-stage Dockerfile.

### Docker build flow

```text
Base image
    ↓
Install all dependencies
    ↓
Generate Prisma client
    ↓
Build NestJS application
    ↓
Install production-only dependencies
    ↓
Create final runtime image
```

### Build the image

```bash
docker build -t business-saas-api .
```

### Run the container

```bash
docker run --env-file .env -p 8080:8080 business-saas-api
```

When the container starts:

```text
read DATABASE_URL
        ↓
npx prisma migrate deploy
        ↓
apply missing committed migrations
        ↓
start NestJS API
```

If migration deployment fails, the API does not start.

The API is available at:

```text
http://localhost:8080
```

The PostgreSQL database is external. Docker does not currently start its own PostgreSQL container.

### Docker security

- `.env` is not copied into the image.
- Secrets are supplied at runtime.
- The final production container runs as the non-root `node` user.
- Development dependencies are excluded from the final runtime image.

---

## Authentication

### Signup flow

```text
Signup request
      ↓
Validate DTO
      ↓
Check existing email
      ↓
Hash password with bcrypt
      ↓
Create user
      ↓
Create email-verification token
      ↓
Store token hash
      ↓
Send verification email
```

The database unique constraint protects against duplicate-email race conditions.

### Login flow

```text
Login request
      ↓
Validate credentials
      ↓
Check account status
      ↓
Check email verification
      ↓
Create access token
      ↓
Create refresh session
      ↓
Store refresh-token hash
      ↓
Set HttpOnly cookies
```

Each login creates a separate session, which allows multi-device authentication.

### Refresh flow

```text
Refresh cookie
      ↓
Hash supplied refresh token
      ↓
Find session
      ↓
Check session expiry
      ↓
Check user status
      ↓
Create new access token
      ↓
Replace access-token cookie
```

Expired sessions are removed when detected.

### Logout flow

```text
Refresh cookie
      ↓
Hash refresh token
      ↓
Delete matching session
      ↓
Clear authentication cookies
```

Only the matching session is deleted, allowing other device sessions to remain active.

### Email verification flow

```text
Verification link
      ↓
Hash supplied verification token
      ↓
Find verification-token record
      ↓
Check expiry
      ↓
Mark email as verified
      ↓
Delete verification tokens
```

### Password-reset flow

```text
Forgot-password request
      ↓
Create secure reset token
      ↓
Store token hash
      ↓
Send reset email
      ↓
User submits new password
      ↓
Validate reset token
      ↓
Hash new password
      ↓
Update password
      ↓
Delete all user sessions
      ↓
Delete reset token
```

Password reset invalidates all existing sessions so the user must log in again.

### Google OAuth

Google OAuth uses Passport with:

```text
passport-google-oauth20
```

Google-authenticated users are treated as email verified.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/login` | Log in with email/password |
| `POST` | `/auth/logout` | Log out the current session |
| `POST` | `/auth/refresh` | Create a new access token |
| `GET` | `/auth/me` | Return the authenticated user |
| `POST` | `/auth/verify-email` | Verify an email address |
| `POST` | `/auth/resend-verification-email` | Send a new verification email |
| `POST` | `/auth/forgot-password` | Request a password-reset email |
| `POST` | `/auth/reset-password` | Reset the account password |
| `GET` | `/auth/google` | Start Google OAuth |
| `GET` | `/auth/google/callback` | Google OAuth callback |

More business-management endpoints will be added as the SaaS modules are implemented.

---

## Validation

Global request validation is enabled using NestJS `ValidationPipe`.

Current configuration:

```text
whitelist: true
forbidNonWhitelisted: true
transform: true
```

This provides:

- DTO validation
- rejection of unexpected properties
- request transformation
- string trimming
- email normalization

---

## Cookies

Authentication tokens are stored in HttpOnly cookies.

### Development

```text
secure: false
sameSite: lax
```

### Production

```text
secure: true
sameSite: none
```

Frontend HTTP clients must send credentials.

Axios example:

```ts
axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true,
});
```

---

## CORS

CORS uses the frontend URL provided by:

```env
CLIENT_URL=
```

Credentials are enabled so authentication cookies can be sent between the frontend and backend.

Local example:

```env
CLIENT_URL=http://localhost:3000
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run start` | Start the NestJS application |
| `npm run start:dev` | Start development mode with watch |
| `npm run start:debug` | Start in debug/watch mode |
| `npm run start:prod` | Start the compiled production application |
| `npm run build` | Build the NestJS application |
| `npm run format` | Format source and test files with Prettier |
| `npm run lint` | Lint source and tests |
| `npm run lint:src` | Lint application source |
| `npm run lint:test` | Lint tests |
| `npm run lint:fix` | Automatically fix lint issues where possible |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:debug` | Run Jest in debug mode |
| `npm run test:e2e` | Run end-to-end tests |

---

## Testing

### Unit tests

```bash
npm test
```

### Watch mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:cov
```

### End-to-end tests

```bash
npm run test:e2e
```

End-to-end Jest configuration is stored in:

```text
test/jest-e2e.json
```

---

## Security

The project currently follows these practices:

- Passwords are hashed with bcrypt.
- Raw refresh tokens are not stored.
- Raw verification tokens are not stored.
- Raw password-reset tokens are not stored.
- Authentication cookies are HttpOnly.
- Secure cookies are enabled in production.
- DTO validation is enabled globally.
- Unexpected DTO properties are rejected.
- User status is checked during authentication.
- Password reset invalidates all active sessions.
- Database unique constraints protect unique fields.
- Authentication secrets are loaded from environment variables.
- `.env` is excluded from Git and Docker build context.
- Generated Prisma client files are excluded from Git.
- Production Docker containers run as a non-root user.

---

## Roadmap

### Current foundation

```text
NestJS
PostgreSQL
Prisma
Authentication
Email
Google OAuth
Docker
Validation
CORS
```

### Next modules

```text
Organizations
Organization authorization
Branches
Staff
Services
Customers
Schedules / availability
Bookings
```

### Later phases

```text
Payments
Invoices
Subscriptions
Notifications
Analytics
Inventory
Audit logs
Redis
BullMQ
S3
Webhooks
OpenTelemetry
React Native mobile application
```

---

## License

UNLICENSED
