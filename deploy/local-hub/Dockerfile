FROM node:22-alpine
WORKDIR /app
COPY deploy/local-hub/server.mjs deploy/local-hub/pairing.mjs deploy/local-hub/commands.mjs deploy/local-hub/customer-sessions.mjs ./
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
