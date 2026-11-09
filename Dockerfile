# ==============================================================================
# SAAMX Production Container Packaging — Multi-Stage Build
# Platform: Cloud Run / Container Runtime
# Base: Node.js 20 Alpine Linux
# Security: Unprivileged non-root user (node:node), dumb-init signal handler
# Healthcheck: /api/ping
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder (Dependencies, Frontend Vite Compilation & Asset Generation)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application source code
COPY . .

# Compile optimized production frontend bundle
RUN npm run build

# Prune development dependencies to retain lean production runtime footprint
RUN npm prune --production

# ------------------------------------------------------------------------------
# Stage 2: Production Runner (Lean, Unprivileged, Secure Runtime)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install dumb-init for proper signal forwarding and PID 1 zombie process reaping
RUN apk add --no-cache dumb-init

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Ensure /app and runtime writable directories are owned by node user
RUN mkdir -p /app/backups && chown -R node:node /app

# Ensure correct file permissions for unprivileged node user (UID 1000, GID 1000)
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/server.js ./server.js
COPY --chown=node:node --from=builder /app/scoring_engine.js ./scoring_engine.js
COPY --chown=node:node --from=builder /app/initial_securities.js ./initial_securities.js
COPY --chown=node:node --from=builder /app/universe_generator.js ./universe_generator.js
COPY --chown=node:node --from=builder /app/universe_data.js ./universe_data.js
COPY --chown=node:node --from=builder /app/parsed_universe.json ./parsed_universe.json
COPY --chown=node:node --from=builder /app/database ./database
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/services ./services

# Switch to unprivileged non-root user
USER node

# Authoritative health check on backend ping endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3000}/api/ping || exit 1

# Expose standard Cloud Run service port
EXPOSE 3000

# Use dumb-init as top-level PID 1 process
ENTRYPOINT ["dumb-init", "--"]

# Launch authoritative backend server
CMD ["node", "server.js"]
