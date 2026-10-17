FROM node:22-alpine
WORKDIR /app
COPY deploy/local-hub/server.mjs deploy/local-hub/pairing.mjs deploy/local-hub/commands.mjs deploy/local-hub/customer-sessions.mjs deploy/local-hub/activation-state.mjs deploy/local-hub/ha-device-discovery.mjs deploy/local-hub/device-inventory.mjs deploy/local-hub/ruvexa-preview.mjs ./
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
