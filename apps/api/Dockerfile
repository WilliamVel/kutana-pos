# Build context is the repository root (see docker-compose.yml).
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# @kutana/shared is exported as TypeScript source, so the API runs through the
# same swc loader as `pnpm dev`, without --watch.
CMD ["pnpm", "--filter", "@kutana/api", "exec", "node", "--import", "@swc-node/register/esm-register", "src/main.ts"]
