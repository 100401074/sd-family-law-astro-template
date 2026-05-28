# Multi-stage build for the Astro static site.
# Stage 1 builds the dist/ folder; stage 2 serves it with nginx.

# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached layer if package.json unchanged)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Build the static site
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.27-alpine

# Drop the default config and install ours
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built dist
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
