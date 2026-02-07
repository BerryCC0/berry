FROM node:22-slim

WORKDIR /app

# Copy the entire repo since ponder.config.ts imports ABIs from ../app/lib/nouns/abis/
COPY package.json package-lock.json* ./
COPY ponder/package.json ponder/package-lock.json* ./ponder/

# Install ponder dependencies
RUN cd ponder && npm install --production=false

# Copy the rest of the repo (ABIs, config, handlers, utils)
COPY app/lib/nouns/abis/ ./app/lib/nouns/abis/
COPY app/lib/nouns/utils/ ./app/lib/nouns/utils/
COPY ponder/ ./ponder/

WORKDIR /app/ponder

# Ponder uses port 42069 by default
EXPOSE 42069

# Zero-downtime deployments:
# --schema uses RAILWAY_DEPLOYMENT_ID so each deploy writes to its own schema
# --views-schema "ponder_live" keeps views pointing to the latest fully-synced deployment
# Next.js always queries ponder_live for zero downtime
CMD ["sh", "-c", "npx ponder start --schema \"${RAILWAY_DEPLOYMENT_ID:-ponder}\" --views-schema ponder_live"]
