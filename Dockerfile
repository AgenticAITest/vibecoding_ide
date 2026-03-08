# ---- Build stage ----
FROM node:20-alpine AS build

# Install build tools for node-pty native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app/vibecoder

# Copy package files first for better layer caching
COPY vibecoder/package.json vibecoder/package-lock.json* ./
COPY vibecoder/packages/shared/package.json ./packages/shared/
COPY vibecoder/packages/backend/package.json ./packages/backend/
COPY vibecoder/packages/frontend/package.json ./packages/frontend/

RUN npm ci

# Copy source files
COPY vibecoder/tsconfig.base.json ./
COPY vibecoder/packages/shared/ ./packages/shared/
COPY vibecoder/packages/backend/src/ ./packages/backend/src/
COPY vibecoder/packages/backend/tsconfig.json ./packages/backend/
COPY vibecoder/packages/backend/feature-packs/ ./packages/backend/feature-packs/
COPY vibecoder/packages/frontend/ ./packages/frontend/

# Build all packages: shared → backend → frontend
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine

# Runtime dependencies: bash for PTY shell, git for git operations
RUN apk add --no-cache bash git

# Install build tools, rebuild node-pty for runtime, then remove build tools
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && mkdir -p /tmp/pty-rebuild \
    && apk del .build-deps || true

WORKDIR /app

# Copy the workspace package.json (needed for node_modules resolution)
COPY --from=build /app/vibecoder/package.json ./
COPY --from=build /app/vibecoder/packages/shared/package.json ./packages/shared/
COPY --from=build /app/vibecoder/packages/backend/package.json ./packages/backend/

# Copy compiled output
COPY --from=build /app/vibecoder/packages/backend/dist/ ./packages/backend/dist/
COPY --from=build /app/vibecoder/packages/frontend/dist/ ./packages/frontend/dist/

# Copy feature-packs (referenced at runtime by scaffolder)
COPY --from=build /app/vibecoder/packages/backend/feature-packs/ ./packages/backend/feature-packs/

# Copy seed script
COPY scripts/seed-admin.js /app/scripts/seed-admin.js

# Copy node_modules (includes native node-pty built for alpine)
COPY --from=build /app/vibecoder/node_modules/ ./node_modules/

# Create projects directory
RUN mkdir -p /projects/default-app

ENV NODE_ENV=production
ENV PORT=3001
ENV VIBECODER_PROJECT_DIR=/projects/default-app
# In production, CORS is not needed (same origin), but allow override
ENV VIBECODER_CORS_ORIGIN=*

EXPOSE 3001

CMD ["node", "packages/backend/dist/index.js"]
