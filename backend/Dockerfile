FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S sg && adduser -S sg -G sg
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER sg
EXPOSE 5000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "src/index.js"]
