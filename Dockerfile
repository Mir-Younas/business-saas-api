# ---------- Base ----------
FROM node:22.14.0-slim AS base

WORKDIR /app

# Required for Prisma/PostgreSQL TLS connections
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# ---------- Install all dependencies ----------
FROM base AS dependencies

COPY package.json package-lock.json ./

RUN npm ci


# ---------- Build ----------
FROM dependencies AS builder

COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

COPY prisma7.config.ts ./
COPY prisma ./prisma

COPY src ./src

# Generate Prisma client inside Docker
RUN npx prisma generate

# Build NestJS
RUN npm run build


# ---------- Production dependencies ----------
FROM base AS production-dependencies

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force


# ---------- Production ----------
FROM base AS production

ENV NODE_ENV=production

# Runtime dependencies
COPY --from=production-dependencies /app/node_modules ./node_modules

# Compiled NestJS application
COPY --from=builder /app/dist ./dist

# Prisma config + committed migrations are needed at runtime
COPY prisma7.config.ts ./
COPY prisma ./prisma

COPY package.json ./

USER node

EXPOSE 8080

# Apply existing migrations, then start NestJS.
# If migration fails, the API will NOT start.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]