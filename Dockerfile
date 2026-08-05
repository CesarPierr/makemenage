FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Le CLI Prisma dans son propre arbre de dépendances : `output: standalone` ne
# trace que le serveur, donc les deps du CLI (effect, @prisma/config…) seraient
# absentes si on se contentait de copier le dossier `prisma` du builder.
FROM node:24-bookworm-slim AS migrator
WORKDIR /migrator
# Les moteurs doivent être présents dès le build : au runtime le conteneur est
# non-root ET en lecture seule, donc Prisma ne peut rien télécharger. bookworm
# utilise OpenSSL 3.0 — sans cette cible, seul le moteur 1.1.x est installé.
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
RUN npm init -y > /dev/null \
 && npm i --no-audit --no-fund --omit=dev prisma@6.19.0 \
 && npm cache clean --force

FROM node:24-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
COPY --from=migrator /migrator /migrator
ENV NODE_ENV=production
ENV PORT=3000
# Bind on every interface: the reverse proxy and the Tailscale sidecar reach the
# app from other containers, so the default localhost bind would refuse them.
ENV HOSTNAME=0.0.0.0

# Standalone output: server.js + only the traced dependencies (instead of the
# whole node_modules), which is what keeps this image small.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma is not traced by Next (it runs before the server): ship the schema, the
# migrations and the CLI + generated client so `migrate deploy` works at boot.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Run as a non-root user. HOME + npm cache point at /tmp so the process still
# works when the container is started with a read-only root filesystem (the
# compose file mounts a tmpfs at /tmp and /app/.next/cache).
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --home-dir /app nextjs \
 && chown -R nextjs:nodejs /app /migrator
ENV HOME=/tmp
ENV NPM_CONFIG_CACHE=/tmp/.npm
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
