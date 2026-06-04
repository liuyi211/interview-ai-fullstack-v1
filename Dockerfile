FROM node:alpine

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm

USER node

ENV HUSKY=0
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

EXPOSE 3000
