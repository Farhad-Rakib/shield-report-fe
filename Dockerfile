# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js
COPY docker/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80
