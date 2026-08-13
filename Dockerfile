# =============================================================================
# Multi-stage Dockerfile for Enterprise Discord AI Bot
# Stage 1: Build dependencies and compile native addon
# Stage 2: Production image with minimal footprint
# =============================================================================

# Stage 1: Builder
FROM node:20-bookworm-slim AS builder

LABEL maintainer="Enterprise Bot Team"
LABEL description="Enterprise Discord AI Bot - Zero Trust Security Dashboard"
LABEL version="1.0.0"

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests for better caching
COPY package.json package-lock.json ./

# Install ALL dependencies including devDependencies for build
RUN npm ci --no-audit --no-fund --production=false || npm install --no-audit --no-fund --legacy-peer-deps

# Copy source code
COPY . .

# Build native addon
RUN npm run build:native

# Build worker bundle
RUN npm run build:worker

# Build frontend and server bundle
RUN npm run build

# Stage 2: Production
FROM node:20-bookworm-slim AS production

LABEL maintainer="Enterprise Bot Team"
LABEL description="Enterprise Discord AI Bot - Production Runtime"
LABEL version="1.0.0"

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=appuser:appuser /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=appuser:appuser /app/server-build ./server-build
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/public ./public
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/backups /app/snapshots /app/logs /app/audit_logs && \
    chown -R appuser:appuser /app /app/data /app/backups /app/snapshots /app/logs /app/audit_logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server-build/server.cjs"]
