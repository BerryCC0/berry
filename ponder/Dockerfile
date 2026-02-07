FROM node:22-slim

WORKDIR /app

# Copy the entire repo since ponder.config.ts imports ABIs from ../app/lib/nouns/abis/
COPY package.json package-lock.json* ./
COPY ponder/package.json ponder/package-lock.json* ./ponder/

# Install ponder dependencies
RUN cd ponder && npm install --production=false

# Copy the rest of the repo (ABIs, config, handlers)
COPY app/lib/nouns/abis/ ./app/lib/nouns/abis/
COPY ponder/ ./ponder/

WORKDIR /app/ponder

# Ponder uses port 42069 by default
EXPOSE 42069

CMD ["npx", "ponder", "start", "--schema", "ponder"]
