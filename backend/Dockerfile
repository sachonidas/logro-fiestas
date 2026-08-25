# syntax=docker/dockerfile:1

# ---- Build: compila TypeScript a dist/ ----
FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---- Runtime: solo dependencias de producción ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /build/dist ./dist

# El puerto lo lee src/index.ts de PORT; 3000 es el valor por defecto.
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
