#!/bin/bash
set -e

# Set default paths for database initialization if not already set via environment variables
DB_INITIALIZATION_PATH="${DB_INITIALIZATION_PATH:-"/uwazi/database/blank_state/uwazi_development"}"
DB_INITIALIZATION_PATH_DEMO="/uwazi/uwazi-fixtures/dump/uwazi_development"

# Display key environment settings for debugging purposes
echo "Uwazi Version: ($UWAZI_GIT_RELEASE_REF) ($NODE_ENV)"
echo "Database Host: $DATABASE_HOST"
echo "Database Name: $DATABASE_NAME"
echo "Elasticsearch Host: $ELASTICSEARCH_URL"
echo "Elasticsearch Index: $INDEX_NAME"
echo "Demo Run: $IS_FIRST_DEMO_RUN"
export DBHOST=$DATABASE_HOST
export FILES_ROOT_PATH=/uwazi/

# Function to check if MongoDB is ready and accessible
wait_for_mongo() {
  echo "Waiting for MongoDB to be ready..."
  local retries=10
  until mongosh --host "${DBHOST:-mongo}" --eval "db.adminCommand('ping')" &>/dev/null; do
    if [ $retries -le 0 ]; then
      echo "MongoDB is not ready after multiple attempts. Exiting."
      exit 1
    fi
    echo "MongoDB is not ready yet. Retrying in 5 seconds... ($retries retries left)"
    retries=$((retries - 1))
    sleep 5
  done
  echo "MongoDB is ready."
}

# Function to check if Elasticsearch is ready and accessible
wait_for_elasticsearch() {
  echo "Waiting for Elasticsearch to be ready..."
  local retries=10
  until curl -s "${ELASTICSEARCH_URL:-http://elasticsearch:9200}" &>/dev/null; do
    if [ $retries -le 0 ]; then
      echo "Elasticsearch is not ready after multiple attempts. Exiting."
      exit 1
    fi
    echo "Elasticsearch is not ready yet. Retrying in 5 seconds... ($retries retries left)"
    retries=$((retries - 1))
    sleep 5
  done
  echo "Elasticsearch is ready."
}

# Function to check if Redis is ready and accessible
wait_for_redis() {
  echo "Waiting for Redis to be ready..."
  local retries=10
  until redis-cli -h "${REDIS_HOST:-redis}" ping &>/dev/null; do
    if [ $retries -le 0 ]; then
      echo "Redis is not ready after multiple attempts. Exiting."
      exit 1
    fi
    echo "Redis is not ready yet. Retrying in 5 seconds... ($retries retries left)"
    retries=$((retries - 1))
    sleep 5
  done
  echo "Redis is ready."
}

# Check if the database exists
db_exists() {
  mongosh --host "$DBHOST" --eval "db.getMongo().getDB('$DATABASE_NAME').getCollectionNames().length > 0" | grep -q "true"
}

# Wait for services to be ready before proceeding
wait_for_mongo
wait_for_elasticsearch
wait_for_redis

# Ensure the 'uploaded_documents' directory exists for storing document uploads
mkdir -p ./uploaded_documents

# Conditional initialization
if db_exists; then
  echo "Database '$DATABASE_NAME' exists. Skipping initial setup."
else
  echo "Database '$DATABASE_NAME' does not exist. Running initial setup..."
  if [ "$IS_FIRST_DEMO_RUN" = "true" ]; then
    echo "Setting up demo database..."
    rm -rf ./uploaded_documents/*  # Clean uploaded_documents directory
    cp -r ./uwazi-fixtures/uploaded_documents/* ./uploaded_documents/
    mongorestore -h "$DBHOST" "$DB_INITIALIZATION_PATH_DEMO" --db="$DATABASE_NAME"
  else
    echo "Initializing blank database state..."
    NODE_ENV=production yarn blank-state "$DATABASE_NAME"
  fi
  echo "Initial database setup complete."
fi

# Run migrations and reindex
echo "Running migrations and reindexing..."
NODE_ENV=production DATABASE_NAME="$DATABASE_NAME" INDEX_NAME="$INDEX_NAME" FILES_ROOT_PATH="$FILES_ROOT_PATH" yarn migrate-and-reindex
echo "Migrations and reindexing complete."

# Start the Uwazi server in production mode
echo "Starting Uwazi server..."
DATABASE_NAME=${DATABASE_NAME} INDEX_NAME=$INDEX_NAME NODE_ENV=production FILES_ROOT_PATH=$FILES_ROOT_PATH yarn run-production
