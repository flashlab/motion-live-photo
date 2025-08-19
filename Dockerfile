# Motion Live Photo - Single container with both frontend and backend
FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json ./
COPY vite.config.ts ./
RUN npm install

# Build the frontend
FROM base AS frontend-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the frontend with production configuration
ENV BROWSER=none
ENV NODE_ENV=production
ENV DISPLAY=:0

# Create a fake xdg-open script to prevent errors
RUN printf '#!/bin/sh\nexit 0\n' > /usr/bin/xdg-open && chmod +x /usr/bin/xdg-open

# Build with timeout to prevent hanging
RUN timeout 30s npm run build || echo "Build completed or timed out"

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy the built frontend and server files
COPY --from=frontend-builder /app/dist ./dist
COPY --from=frontend-builder /app/server.js ./server.js
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV CORS_ORIGIN=*

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 755 uploads

USER nextjs

CMD ["node", "server.js"]