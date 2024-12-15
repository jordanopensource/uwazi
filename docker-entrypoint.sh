#!/bin/bash
set -e

# Set default paths for database initialization if not already set via environment variables
DB_INITIALIZATION_PATH="${DB_INITIALIZATION_PATH:-"/uwazi/database/blank_state/uwazi_development"}"
DB_INITIALIZATION_PATH_DEMO="/uwazi/uwazi-fixtures/dump/uwazi_development"

# Ensure MONGO_URI is provided
if [ -z "$MONGO_URI" ]; then
  echo "Error: MONGO_URI is not set. Please provide the MongoDB connection URI."
  exit 1
fi

# Display key environment settings for debugging purposes
echo "Uwazi Version: ($UWAZI_GIT_RELEASE_REF) ($NODE_ENV)"
echo "MongoDB URI: $MONGO_URI"
echo "Database Name: $DATABASE_NAME"
echo "Elasticsearch Host: $ELASTICSEARCH_URL"
echo "Elasticsearch Index: $INDEX_NAME"
echo "Demo Run: $IS_FIRST_DEMO_RUN"
export FILES_ROOT_PATH=/uwazi/

# Function to check if MongoDB is ready and accessible
wait_for_mongo() {
  echo "Waiting for MongoDB to be ready..."
  local retries=10
  until mongosh "$MONGO_URI" --eval "db.adminCommand('ping')" &>/dev/null; do
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

# Check if the default collections exist in the database
db_exists() {
  local collections=(
    'connections'
    'translationsV2'
    'activitylogs'
    'settings'
    'users'
    'templates'
    'relationtypes'
    'updatelogs'
    'migrations'
    'migrationHubRecords'
    'files'
    'relationshipMigrationFields'
    'entities'
    'sessions'
    'relationships'
    'dictionaries'
  )

  # Get the list of existing collections in the database
  local existing_collections
  existing_collections=$(mongosh "$MONGO_URI" --eval "db.getMongo().getDB('$DATABASE_NAME').getCollectionNames()" --quiet)

  # Check if all required collections are present
  for collection in "${collections[@]}"; do
    if [[ "$existing_collections" != *"$collection"* ]]; then
      return 1  # Missing a collection
    fi
  done

  return 0  # All collections exist
}

# Wait for services to be ready before proceeding
wait_for_mongo
wait_for_elasticsearch

# Ensure the 'uploaded_documents' directory exists for storing document uploads
mkdir -p ./uploaded_documents

# Conditional initialization
if db_exists; then
  echo "Database '$DATABASE_NAME' is fully initialized with default collections. Skipping setup."
else
  echo "Database '$DATABASE_NAME' is not fully initialized. Proceeding with setup..."
  if [ "$IS_FIRST_DEMO_RUN" = "true" ]; then
    echo "Setting up demo database..."
    rm -rf ./uploaded_documents/*  # Clean uploaded_documents directory
    cp -r ./uwazi-fixtures/uploaded_documents/* ./uploaded_documents/
    mongorestore --uri "$MONGO_URI" "$DB_INITIALIZATION_PATH_DEMO" --db="$DATABASE_NAME"
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
