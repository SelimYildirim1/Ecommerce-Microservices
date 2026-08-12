FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_MEDIA_URL
ARG NEXT_PUBLIC_CATALOG_ADMIN_URL
ARG NEXT_PUBLIC_PROMOTION_URL
ARG NEXT_PUBLIC_SHIPPING_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL
ENV NEXT_PUBLIC_CATALOG_ADMIN_URL=$NEXT_PUBLIC_CATALOG_ADMIN_URL
ENV NEXT_PUBLIC_PROMOTION_URL=$NEXT_PUBLIC_PROMOTION_URL
ENV NEXT_PUBLIC_SHIPPING_URL=$NEXT_PUBLIC_SHIPPING_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
