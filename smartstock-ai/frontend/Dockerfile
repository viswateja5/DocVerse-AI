# Stage 1: Build React App
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (Non-Root)
FROM nginx:alpine

# Copy custom nginx config (which will listen on 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to nginx html dir
COPY --from=builder /app/dist /usr/share/nginx/html

# Change ownership of nginx directories to non-root nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Healthcheck to verify Nginx is serving traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
