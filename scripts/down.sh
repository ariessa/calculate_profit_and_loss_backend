# #!/bin/bash

# # Load environment variables from .env file
# if [ -f ".env" ]; then
#     set -a
#     source .env
#     set +a
# fi

# CONTAINERS=("${APP_CONTAINER_NAME}" "${DB_CONTAINER_NAME}")

# # Stop all Docker containers
# for CONTAINER in "${CONTAINERS[@]}"; do
#     docker stop "$CONTAINER" || true
# done

#!/bin/bash

# Load environment variables from .env file
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

CONTAINERS=("${APP_CONTAINER_NAME}" "${DB_CONTAINER_NAME}")
IMAGES=("${APP_IMAGE}" "${DB_IMAGE}")
FILES=("node_modules")
VOLUMES=("app" "db")

# Stop all Docker containers
for CONTAINER in "${CONTAINERS[@]}"; do
    docker kill "$CONTAINER" || true
done

# Remove all Docker containers
for CONTAINER in "${CONTAINERS[@]}"; do
    docker rm "$CONTAINER" || true
done

# Remove all Docker images
for IMAGE in "${IMAGES[@]}"; do
    docker rmi "$IMAGE" || true
done

# Remove all Docker volumes
for VOLUME in "${VOLUMES[@]}"; do
    docker volume rm "$VOLUME" || true
done

# Check which process is running on port 3306 and kill the process by PID
sudo kill -9 $(sudo lsof -i :3306 | awk 'NR==2{print $2}') || true

# Delete files and folders
for FILE in "${FILES[@]}"; do
    sudo rm -rf "$FILE" || true
done

# Check if the folder exists
if [ -d "$DB_DIRECTORY" ]; then
    # Ask for confirmation before deleting database folder
    read -p "Are you sure you want to delete the DB directory '$DB_DIRECTORY'? (y/n): " confirmation

    if [[ "$confirmation" == "y" || "$confirmation" == "Y" ]]; then
        # Delete the folder
        rm -rf "$DB_DIRECTORY"
        echo "DB directory '$DB_DIRECTORY' has been deleted."
    else
        echo "DB directory deletion canceled."
    fi
fi