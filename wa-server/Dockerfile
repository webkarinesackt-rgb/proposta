FROM node:20-bookworm-slim

WORKDIR /app

# ffmpeg-static já bundla o binário, então não precisamos do apt ffmpeg.
# Mas instalamos ca-certificates e tini pra PID 1 saudável.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.js ./
COPY public ./public

# Os diretórios de estado são volumes — criamos com dono correto
RUN mkdir -p /app/auth /app/data /app/library/audios

ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","index.js"]
