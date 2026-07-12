# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies first (cached unless the manifests change)
COPY package.json bun.lock* .npmrc ./
RUN bun install --frozen-lockfile

# Copy the rest of the source and build
COPY . .

# Generate the Prisma client (outputs to src/generated/prisma) and build the app.
# svelte-kit sync runs via the "prepare" script during install, but we run the
# full build here which emits the adapter-node server into ./build.
RUN bunx prisma generate && bun run build

# Prune dev dependencies so only production deps ship in the runtime image
RUN rm -rf node_modules && bun install --frozen-lockfile --production

# ---- Runtime stage ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
# adapter-node listens on 0.0.0.0:3000 by default; make the port configurable
ENV PORT=3000
# /api/screenshot accepts files up to 5 GB (Airtable's URL-attachment ceiling);
# adapter-node otherwise rejects bodies over 512 KB before the handler runs
ENV BODY_SIZE_LIMIT=6G

# Bring over the built server, production deps, and Prisma runtime files.
# prisma.config.ts is required by the CLI to resolve DATABASE_URL for migrations.
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

# Run as the non-root user provided by the base image
USER bun

EXPOSE 3000

# Apply any pending migrations before booting. `migrate deploy` is idempotent:
# it only runs migrations not yet recorded in the target database.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun ./build/index.js"]
