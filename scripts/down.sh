# #!/bin/bash

# Load environment variables from .env file
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

CONTAINERS=("${APP_CONTAINER_NAME}" "${DB_CONTAINER_NAME}")

# Stop all Docker containers
for CONTAINER in "${CONTAINERS[@]}"; do
    docker stop "$CONTAINER" || true
done
