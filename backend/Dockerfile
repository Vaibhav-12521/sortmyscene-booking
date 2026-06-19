# ---- Backend image ----
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only (mongodb-memory-server is a devDep and is
# intentionally excluded — containers connect to the real MongoDB service).
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]
