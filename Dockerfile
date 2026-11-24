# Static build served by nginx. VITE_* are read at build time, so each environment
# needs its own image: the deploy workflow passes production's values.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_OIDC_ISSUER
RUN case "$VITE_API_URL" in https://*) ;; *) echo "VITE_API_URL must be trem.API's https origin"; exit 1;; esac \
 && case "$VITE_OIDC_ISSUER" in https://*) ;; *) echo "VITE_OIDC_ISSUER must be authentik's trem issuer"; exit 1;; esac \
 && npm run build

# Runs as an unprivileged user on 8080; the deploy keeps the root filesystem read-only.
FROM nginxinc/nginx-unprivileged:1.29-alpine
LABEL app=trem-front
LABEL project=trem
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
