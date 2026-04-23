# Build Stage
FROM node:20 AS builder
WORKDIR /app

# Borramos cualquier rastro previo para evitar conflictos de arquitectura
COPY package.json ./
RUN npm install --include=optional

COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime Stage
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
