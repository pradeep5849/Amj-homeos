FROM node:22-alpine
WORKDIR /app
COPY deploy/local-hub/server.mjs ./server.mjs
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
