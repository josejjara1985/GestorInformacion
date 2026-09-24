FROM node:22-bookworm-slim

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
COPY docker-entrypoint.sh ./
COPY data/esquema.json data/calendario_seed.json data/esquema.sql ./seed/
COPY data/juzgado.db ./seed/juzgado.db
COPY data/plantillas ./seed/plantillas

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p data/plantillas data/backups data/backups-redundante data/backups-tmp data/outbox data/vault \
  && cp -a seed/. data/

ENV NODE_ENV=production
ENV TZ=America/Bogota
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
