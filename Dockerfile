FROM node:20-slim AS base

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/errors/package.json packages/errors/tsconfig.json ./packages/errors/
COPY packages/config/package.json packages/config/tsconfig.json ./packages/config/
COPY packages/providers/package.json packages/providers/tsconfig.json ./packages/providers/
COPY apps/web/package.json apps/web/tsconfig.json ./apps/web/
COPY apps/cli/package.json apps/cli/tsconfig.json ./apps/cli/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (cache bust on every deploy)
ARG CACHEBUST=1
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY templates/ ./templates/

# Build all packages then web app
RUN pnpm --filter @typeset-ai/errors build \
    && pnpm --filter @typeset-ai/config build \
    && pnpm --filter @typeset-ai/providers build \
    && pnpm --filter @typeset-ai/core build \
    && pnpm --filter @typeset-ai/web build

# Production stage
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=base /app ./

EXPOSE 3000

CMD ["pnpm", "--filter", "@typeset-ai/web", "start"]
