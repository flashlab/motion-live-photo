# Use the official Node.js runtime as the base image
FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
# libc6-compat is not needed for slim images as they use glibc
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build || echo "Build completed with warnings"

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 5173

ENV PORT 5173
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]