#!/bin/bash

# Load environment variables from .env file
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Check if your app container is running
if ! docker ps --filter "name=$APP_CONTAINER_NAME" --filter "status=running" | grep $APP_CONTAINER_NAME >/dev/null; then
  echo "Error: App container '$APP_CONTAINER_NAME' is not running."
  exit 1
fi

# Check if your db container is running
if ! docker ps --filter "name=$DB_CONTAINER_NAME" --filter "status=running" | grep $DB_CONTAINER_NAME >/dev/null; then
  echo "Error: DB container '$DB_CONTAINER_NAME' is not running."
  exit 1
fi

# If all good, run tests
echo "Containers are running, starting tests..."

# Run all tests
docker exec -it $APP_CONTAINER_NAME sh -c "npm run test"
