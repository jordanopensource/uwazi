#!/bin/bash
set -e

# Function to log messages with timestamps
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Navigate to the script's directory
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" || exit ; pwd -P )
cd "$parent_path" || exit

# Function to recreate the database
recreate_database() {
    log "Dropping database '$DATABASE_NAME'..."
    mongosh "$MONGO_URI" --eval "db.dropDatabase()" || { log "Failed to drop database '$DATABASE_NAME'"; exit 1; }

    log "Restoring database from dump..."
    mongorestore --uri "$MONGO_URI" blank_state/uwazi_development/ || { log "Failed to restore database"; exit 1; }

    log "Running migrations..."
    INDEX_NAME=$INDEX_NAME DATABASE_NAME=$DATABASE_NAME yarn migrate || { log "Failed to run migrations"; exit 1; }

    log "Reindexing..."
    INDEX_NAME=$INDEX_NAME DATABASE_NAME=$DATABASE_NAME yarn reindex || { log "Failed to reindex"; exit 1; }

    log "Database recreation complete."
    exit 0
}

# Main execution
log "Starting database recreation process for '$DATABASE_NAME'..."
recreate_database
