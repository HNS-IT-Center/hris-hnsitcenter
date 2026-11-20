# Production image for the HNS VPS (Dokploy), same shape as Teknisi and Cek Stok.
#
# `npm run build` produces `.next/standalone`; the postbuild step
# (scripts/copy-standalone-assets.mjs) copies `.next/static` and `public/`
# beside it, and `node server.js` serves the lot.
#
# Build arguments (Dokploy: "Build-time Arguments"). NEXT_PUBLIC_* values are
# compiled into the browser bundle, so changing one means rebuilding:
#   NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_R2_PUBLIC_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY
#
# Everything else (DATABASE_URL, SSO_*, R2_*, VAPID_PRIVATE_KEY, CRON_SECRET,
# RESEND_*) is read at run time and belongs in the container's environment,
# never in the image.

# Next 16 needs Node >= 20.9 and Prisma 7 >= 20.19. Debian (glibc) rather than Alpine.
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# `npm ci` runs `prisma generate` (postinstall), which reads prisma.config.ts,
# which needs DATABASE_URL to be set. Generating never connects, so a
# placeholder is enough; the real URL arrives at run time.
ARG DATABASE_URL="mysql://build:build@localhost:3306/build"
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app

# HOSTNAME: Docker sets it to the container id, and Next's standalone server
# binds to whatever HOSTNAME says; 0.0.0.0 makes it reachable by the proxy.
#
# TZ stays UTC on purpose. The app was built on Vercel (UTC) and its date code
# assumes a UTC server: lib/utils/date.ts adds WIB_OFFSET_MS to Date.now() and
# then reads UTC fields. Setting TZ=Asia/Jakarta (as Teknisi does) would shift
# those dates by 7 hours. Wall-clock WIB is computed explicitly everywhere.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    TZ=UTC

COPY --from=build --chown=node:node /app/.next/standalone ./

USER node
EXPOSE 3000

# The slim image has neither wget nor curl; Node's own fetch does the job.
# /api/health without ?db=1 answers from the process alone.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "server.js"]
