FROM ghcr.io/cloud-cli/node:latest

WORKDIR /home/app

COPY package.json package-lock.json ./
USER root
RUN npm ci --omit=dev
USER node

COPY dist ./dist
COPY dist-server ./dist-server
COPY openapi ./openapi
