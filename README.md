# Business SaaS API

A production-oriented, multi-tenant business management backend built with **NestJS**, **Prisma 7**, **PostgreSQL**, and **Docker**.

The project is designed for service-based businesses such as salons, clinics, tutors, consultants, and similar organizations that need secure authentication, team management, branches, customers, services, schedules, and bookings.

---

## Overview

The API uses a multi-tenant architecture where one user can belong to multiple organizations and have a different role in each organization.

```text
User
├── Organization A → OWNER
├── Organization B → MANAGER
└── Organization C → STAFF
```

Platform-level authorization and organization-level authorization are intentionally separated.

### Platform Roles

```text
USER
SUPER_ADMIN
```

### Organization Roles

```text
OWNER
ADMIN
MANAGER
RECEPTIONIST
STAFF
```

### Membership Statuses

```text
ACTIVE
SUSPENDED
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
- Email verification and resend flow
- Login and logout
- Access-token authentication
- Refresh-token sessions
- Multi-device sessions
- HttpOnly authentication cookies
- Forgot-password and password-reset flows
- Google OAuth
- Blocked-user protection

Token lifetimes:

| Token | Lifetime |
|---|---:|
| Access token | 15 minutes |
| Refresh session | 7 days |
| Email verification token | 24 hours |
| Password reset token | 15 minutes |

Refresh tokens, email-verification tokens, and password-reset tokens are stored as hashes rather than raw values.

### Organizations

- Create organizations
- List accessible organizations
- Retrieve organization details
- Update organizations
- Soft delete organizations
- Restore deleted organizations
- Organization-level role authorization
- Ownership transfer
- Protection against modifying the owner through normal member-management endpoints

### Organization Invitations

- Invite users by email
- Secure HMAC-hashed invitation tokens
- Invitation expiration
- Invitation email delivery
- Accept invitations
- Decline invitations
- List invitation history
- Resend pending invitations
- Cancel pending invitations
- Track who sent and cancelled invitations
- Invalidate invitation tokens after processing
- Race-condition protection for invitation creation and processing
- Role hierarchy enforcement

Invitation statuses:

```text
PENDING
ACCEPTED
DECLINED
CANCELLED
```

### Organization Members

- List members
- Retrieve an individual member
- Update member roles
- Activate or suspend memberships
- Remove members
- Leave an organization
- OWNER/ADMIN management hierarchy
- Separate ownership-transfer flow

---

## Architecture

Core multi-tenant relationship:

```text
User
 │
 ├── OrganizationMember
 │        │
 │        └── Organization
 │                │
 │                └── Branch
 │
 └── OrganizationInvitation
```

`OrganizationMember` connects a user to an organization and stores the user's organization-specific role and membership status.

`OrganizationInvitation` manages the invitation lifecycle before a user becomes an organization member.

Authorization flow:

```text
JWT Authentication
        ↓
Authenticated User
        ↓
OrganizationRoleGuard
        ↓
Active Organization Membership
        ↓
Required Organization Role
        ↓
Controller
```

---

## Database Models

Current Prisma models:

```text
User
Session
EmailVerificationToken
PasswordResetToken
Organization
OrganizationMember
OrganizationInvitation
Branch
```

Prisma migrations are stored under:

```text
prisma/migrations/
```

The generated Prisma client is created under:

```text
src/generated/prisma/
```

Generated Prisma files are not committed to Git and should not be edited manually.

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
│   ├── common/
│   ├── email/
│   ├── generated/
│   ├── organizations/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── invitations/
│   │   ├── members/
│   │   ├── organizations.controller.ts
│   │   ├── organizations.module.ts
│   │   └── organizations.service.ts
│   ├── prisma/
│   ├── app.module.ts
│   └── main.ts
│
├── test/
├── Dockerfile
├── package.json
├── prisma7.config.ts
└── README.md
```

---

## Prerequisites

```text
Node.js >= 22.14.0
npm >= 10.9.2
```

Check installed versions:

```bash
node -v
npm -v
```

If using NVM:

```bash
nvm use 22
```

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd business-saas-api
```

Install dependencies:

```bash
npm install
```

Create the environment file.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Linux/macOS

```bash
cp .env.example .env
```

Then configure the required environment variables.

---

## Environment Variables

### Application

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | API port | `8080` |
| `APP_NAME` | Application name | `Business SaaS` |
| `API_URL` | Backend base URL | `http://localhost:8080` |
| `CLIENT_URL` | Frontend base URL | `http://localhost:3000` |

### PostgreSQL

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |

### Authentication and Token Security

| Variable | Description |
|---|---|
| `JWT_ACCESS_SECRET` | Signs JWT access tokens |
| `REFRESH_TOKEN_HASH_SECRET` | Hashes refresh tokens |
| `EMAIL_VERIFICATION_TOKEN_HASH_SECRET` | Hashes email-verification tokens |
| `PASSWORD_RESET_TOKEN_HASH_SECRET` | Hashes password-reset tokens |
| `ORGANIZATION_INVITATION_TOKEN_HASH_SECRET` | Hashes organization-invitation tokens |

Generate independent secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use a different generated value for each secret.

### Google OAuth

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

Local callback:

```text
http://localhost:8080/auth/google/callback
```

### SMTP

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP account username/email |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | Sender shown in outgoing emails |

Example:

```env
NODE_ENV=development
PORT=8080
APP_NAME=Business SaaS
API_URL=http://localhost:8080
CLIENT_URL=http://localhost:3000

DATABASE_URL=postgresql://username:password@host:5432/database

JWT_ACCESS_SECRET=replace-with-a-secure-random-secret
REFRESH_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret
EMAIL_VERIFICATION_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret
PASSWORD_RESET_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret
ORGANIZATION_INVITATION_TOKEN_HASH_SECRET=replace-with-a-different-secure-random-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=example@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Business SaaS <example@gmail.com>
```

Do not commit the real `.env` file.

---

## Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Create and apply a development migration after schema changes:

```bash
npx prisma migrate dev --name migration_name
```

Apply committed migrations in deployment environments:

```bash
npx prisma migrate deploy
```

Migration files should be committed to Git. Generated Prisma client files should not be committed.

---

## Running Locally

```bash
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

The API runs at:

```text
http://localhost:8080
```

---

## Docker

Build:

```bash
docker build -t business-saas-api .
```

Run:

```bash
docker run --env-file .env -p 8080:8080 business-saas-api
```

The production image:

- Uses a multi-stage build
- Generates the Prisma client during build
- Installs production-only dependencies in the runtime image
- Applies committed migrations with `prisma migrate deploy`
- Runs as the non-root `node` user
- Does not copy `.env` into the image

The PostgreSQL database is external and is not started by this Docker image.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/login` | Log in |
| `POST` | `/auth/logout` | Log out the current session |
| `POST` | `/auth/refresh` | Create a new access token |
| `GET` | `/auth/me` | Return the authenticated user |
| `POST` | `/auth/verify-email` | Verify an email address |
| `POST` | `/auth/resend-verification-email` | Resend verification email |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password |
| `GET` | `/auth/google` | Start Google OAuth |
| `GET` | `/auth/google/callback` | Google OAuth callback |

### Organizations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/organizations` | Create an organization |
| `GET` | `/organizations` | List accessible organizations |
| `GET` | `/organizations/deleted` | List deleted organizations owned by the user |
| `GET` | `/organizations/:organizationId` | Get organization details |
| `PATCH` | `/organizations/:organizationId` | Update an organization |
| `DELETE` | `/organizations/:organizationId` | Soft delete an organization |
| `PATCH` | `/organizations/:organizationId/restore` | Restore a deleted organization |
| `PATCH` | `/organizations/:organizationId/ownership` | Transfer ownership |

### Organization Invitations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/organizations/:organizationId/invitations` | Create an invitation |
| `GET` | `/organizations/:organizationId/invitations` | List invitations |
| `POST` | `/organizations/:organizationId/invitations/:invitationId/resend` | Resend a pending invitation |
| `DELETE` | `/organizations/:organizationId/invitations/:invitationId` | Cancel a pending invitation |
| `POST` | `/organization-invitations/accept` | Accept an invitation |
| `POST` | `/organization-invitations/decline` | Decline an invitation |

### Organization Members

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/organizations/:organizationId/members` | List members |
| `GET` | `/organizations/:organizationId/members/:memberId` | Get one member |
| `PATCH` | `/organizations/:organizationId/members/:memberId/role` | Update a member role |
| `PATCH` | `/organizations/:organizationId/members/:memberId/status` | Update membership status |
| `DELETE` | `/organizations/:organizationId/members/me` | Leave an organization |
| `DELETE` | `/organizations/:organizationId/members/:memberId` | Remove a member |

---

## Authorization Rules

### OWNER

- Can manage ADMIN, MANAGER, RECEPTIONIST, and STAFF members
- Can assign the ADMIN role
- Can transfer organization ownership

### ADMIN

- Cannot manage the OWNER
- Cannot manage another ADMIN
- Cannot assign the ADMIN or OWNER role
- Can manage MANAGER, RECEPTIONIST, and STAFF members

The `OWNER` role cannot be assigned through normal invitation or member-role update endpoints.

---

## Validation

Global request validation uses NestJS `ValidationPipe` with:

```text
whitelist: true
forbidNonWhitelisted: true
transform: true
```

This provides DTO validation, unexpected-property rejection, request transformation, string normalization, and email normalization.

---

## Security

Current security practices include:

- Password hashing with bcrypt
- HttpOnly authentication cookies
- Secure cookies in production
- Hashed refresh, verification, reset, and invitation tokens
- Invitation token invalidation after acceptance, decline, or cancellation
- Separate secrets for different token types
- Global DTO validation
- Blocked-user checks during authentication
- Session invalidation after password reset
- Database unique constraints for race-condition protection
- Conditional writes for invitation race-condition protection
- Organization membership and role guards
- Soft-deleted organization access protection
- Organization role hierarchy enforcement
- Runtime environment secrets
- `.env` excluded from Git and Docker build context
- Generated Prisma client excluded from Git
- Non-root production Docker container

---

## Scripts

| Command | Description |
|---|---|
| `npm run start` | Start the NestJS application |
| `npm run start:dev` | Start development mode |
| `npm run start:debug` | Start debug/watch mode |
| `npm run start:prod` | Start compiled production application |
| `npm run build` | Build the application |
| `npm run format` | Format source and test files |
| `npm run lint` | Lint source and tests |
| `npm run lint:src` | Lint application source |
| `npm run lint:test` | Lint tests |
| `npm run lint:fix` | Automatically fix lint issues |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |

---

## Roadmap

### Current Foundation

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
Organizations
Organization authorization
Organization invitations
Organization memberships
Role-based access control
Ownership transfer
```

### Next Modules

```text
Branch management
Services
Customers
Schedules / availability
Bookings
```

### Later Phases

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
