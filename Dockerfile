FROM ghcr.io/cloud-cli/node:latest AS builder

WORKDIR /home/app

COPY package.json package-lock.json ./
USER root
RUN npm ci
USER node

COPY . .
RUN npm run build

FROM ghcr.io/cloud-cli/node:latest AS runtime

WORKDIR /home/app

COPY package.json package-lock.json ./
USER root
RUN npm ci --omit=dev
USER node

COPY --from=builder /home/app/dist ./dist
COPY --from=builder /home/app/dist-server ./dist-server
COPY --from=builder /home/app/openapi ./openapi
