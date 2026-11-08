# Production runtime image. `yarn build` runs first (in CI) and produces dist/.
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

COPY dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/src/main.js"]
