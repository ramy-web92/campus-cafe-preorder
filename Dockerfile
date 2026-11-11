# ##############################################################################
# KMUTT Café Pre-Order — production image (adapted from the Lab 5 Starter Kit)
# One image: the Express API also serves the built React app, on port 3000.
# CI builds it on every Pull Request; Cloud Run runs it (Episode 5).
# No secret is baked in: DATABASE_URL, SESSION_SECRET and DEMO_USER_PASSWORD are
# injected at runtime from Secret Manager.
# Build from the repository root:  docker build -t cafe .
# ##############################################################################

# ---- Stage 1: build the React client (Vite) ---------------------------------
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Empty API URL => the SPA calls the API on the same origin (same container).
ENV VITE_API_URL=""
RUN npm run build

# ---- Stage 2: build the API (TypeScript + Prisma) ---------------------------
FROM node:24-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build

# ---- Stage 3: runtime --------------------------------------------------------
FROM node:24-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl

COPY --from=server-builder /app/server/package*.json ./
# node_modules includes prisma and tsx: the migration job runs `prisma migrate deploy` and the seed from this image.
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/docker-entrypoint.sh ./docker-entrypoint.sh
# Built SPA, served by Express from ../client/dist (config.staticDir).
COPY --from=client-builder /app/client/dist /app/client/dist

RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

USER node
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
