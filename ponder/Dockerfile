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
COPY app/lib/nouns-v2/abis/ ./app/lib/nouns-v2/abis/
COPY app/lib/food-nouns/abis/ ./app/lib/food-nouns/abis/
COPY ponder/ ./ponder/

WORKDIR /app/ponder

# Ponder uses port 42069 by default
EXPOSE 42069

# Zero-downtime deployments:
# --schema uses RAILWAY_DEPLOYMENT_ID so each deploy writes to its own schema
# --views-schema "ponder_live" keeps views pointing to the latest fully-synced deployment
# Next.js always queries ponder_live for zero downtime
#
# scripts/progress-pinger.mjs runs alongside in the background — polls
# Ponder's /metrics endpoint and logs at 5% backfill milestones, replacing
# the firehose of INFO-level per-batch progress logs that flooded Railway.
CMD ["sh", "-c", "node scripts/progress-pinger.mjs & npx ponder start --hostname 0.0.0.0 --schema \"${RAILWAY_DEPLOYMENT_ID:-ponder}\" --views-schema ponder_live"]
