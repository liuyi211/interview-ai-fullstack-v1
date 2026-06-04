FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
ENV NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
ENV NEXT_PUBLIC_WS_URL=ws://localhost:3000
RUN pnpm build
EXPOSE 3001
CMD ["pnpm", "start"]
