# SURAJ SAFETY HERO V2.0 — production image
# Node 22 LTS keeps the prebuilt/compiled better-sqlite3 binary compatible with
# the application's engines (>=20.19) and is a supported Alpine release.
FROM node:22-alpine AS build
RUN apk upgrade --no-cache
# Toolchain so node-gyp can compile better-sqlite3 when no prebuild matches.
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Dev dependencies are needed for the Vite build, then removed.
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
# Date keys the build cache so this layer installs today's OS fixes.
RUN echo "os-refresh 2026-11-24" && apk upgrade --no-cache
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
ENV PORT=3000
ENV HOME=/app
EXPOSE 3000
# Non-root runtime; the SQLite database lives in /app/data.
RUN mkdir -p /app/data && chown -R 10001:10001 /app
USER 10001:10001
CMD ["npm", "start"]
