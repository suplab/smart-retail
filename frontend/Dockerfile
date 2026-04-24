# Multi-stage Dockerfile for React SPA frontend
# dev  — Vite dev server with HMR on port 5173
# prod — nginx serving the built static bundle (served via CloudFront in AWS)

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cache npm install layer separately from source
COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
# VITE_API_BASE_URL injected at build time; points to API Gateway endpoint
ARG VITE_API_BASE_URL=http://localhost:4566
ARG VITE_AWS_REGION=us-east-1
ARG VITE_COGNITO_USER_POOL_ID=
ARG VITE_COGNITO_CLIENT_ID=
RUN npm run build

# ── Stage 2: Dev server (Vite HMR) ─────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Stage 3: Production nginx ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
# SPA routing: all paths fall back to index.html for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
