# ---------------------------------------------------------------------------
# Menhirs Fate: Weavers of Elandra — full deployment (story + online duels)
#
#   docker build -t menhirs-fate .
#   docker run -p 3000:3000 menhirs-fate
#
# This image runs the Node server, which serves the game AND hosts the
# authoritative duel rooms over websockets.
# ---------------------------------------------------------------------------
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# dependencies first, so edits to the game do not re-install anything
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# the game: client, shared engine, content and server
COPY public ./public
COPY src ./src
COPY server.js ./

# run as the non-root user that ships with the node image
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
