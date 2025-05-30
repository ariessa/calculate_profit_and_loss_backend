#!/bin/bash

# Load environment variables from .env file
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Install packages using npm
npm install

# Check if the network already exists
if ! docker network inspect $NETWORK_NAME >/dev/null 2>&1; then
    echo "Creating network: $NETWORK_NAME"
    docker network create $NETWORK_NAME
fi

# Build and start Docker container(s) in detached mode
docker-compose --env-file .env --file docker-compose.yml up -d
