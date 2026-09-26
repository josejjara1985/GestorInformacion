FROM node:22-bookworm-slim

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY .env .env

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
COPY docker-entrypoint.sh ./
COPY data/esquema.json data/calendario_seed.json data/esquema.sql ./seed/
COPY data/plantillas ./seed/plantillas

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p data/plantillas data/backups data/backups-redundante data/backups-tmp data/outbox data/vault

ENV NODE_ENV=production
ENV TZ=America/Bogota
EXPOSE 3000

ENV TURSO_URL=libsql://gestor-juzgado-josejjara1985.aws-us-east-1.turso.io
ENV TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJp
YXQiOjE3OTAzNzQ4MDksImlkIjoiMDFhMGRhYTUtMzUwMS03NWMwLThiNzctMTBkYjA3MGJkYT
ZkIiwia2lkIjoiSnRiRk4ydUYwMjVGLWZzSHNFclpJN1dVZmlGWDRFVE11eXJ6ejg2SjRFNCIs
InJpZCI6ImFkZWRkYzFlLTJhMDEtNDNlOS1hZmZiLWJlY2UzM2Q4NjNlZCJ9.UY72jwWt8YxOO
Si0FlAUU3jShQy5b1Br3UR4VGsSU-qWFmtnSitbV1k__vI4KakS4N9g_iG_shTFCcE6d1kkDQ

ENTRYPOINT ["./docker-entrypoint.sh"]
