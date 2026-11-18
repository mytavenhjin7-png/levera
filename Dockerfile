# LEVERA store — production image (Railway, Render, Fly.io, any VPS with Docker)
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
# only what the server needs (mysql2); photo tools (sharp, playwright) stay out of production
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
# admin-uploaded photos and generated files live here: mount volumes on these paths to keep them between deploys
VOLUME ["/app/uploads", "/app/data"]
EXPOSE 8787
CMD ["node", "--no-warnings", "server/index.mjs"]
