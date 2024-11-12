#!/bin/bash
set -e

# Default paths for DB initialization
DB_INITIALIZATION_PATH="${DB_INITIALIZATION_PATH:-"/uwazi/database/blank_state/uwazi_development"}"
DB_INITIALIZATION_PATH_DEMO="/uwazi/uwazi-fixtures/dump/uwazi_development"

# Display environment settings
echo "Uwazi Version: ($UWAZI_GIT_RELEASE_REF) ($NODE_ENV)"
echo "Database Host: $DBHOST"
echo "Database Name: $DATABASE_NAME"
echo "Elasticsearch Host: $ELASTICSEARCH_URL"
echo "Elasticsearch Index: $INDEX_NAME"
echo "First Run: $IS_FIRST_RUN"
echo "Demo Run: $IS_FIRST_DEMO_RUN"
echo "Migrate and Reindex: $MIGRATE_AND_REINDEX"

# Ensure required directories exist
mkdir -p ./uploaded_documents

# Initialize database if IS_FIRST_RUN is set
if [ "$IS_FIRST_RUN" = "true" ]; then
    echo "Initializing MongoDB database from blank state..."
    NODE_ENV=production yarn blank-state $DATABASE_NAME
    echo "Initial database setup complete."
    exit 0

elif [ "$IS_FIRST_DEMO_RUN" = "true" ]; then
    echo "Setting up MongoDB with demo data..."

    echo "Restoring PDF documents..."
    rm -rf ./uploaded_documents/*
    cp -r ./uwazi-fixtures/uploaded_documents/* ./uploaded_documents/

    echo "Dropping existing database: ${DATABASE_NAME}"
    mongosh -host "${DBHOST:-mongo}" "${DATABASE_NAME:-uwazi_development}" --eval "db.dropDatabase()"

    echo "Importing demo data..."
    mongorestore -h "${DBHOST:-mongo}" "$DB_INITIALIZATION_PATH_DEMO" --db="${DATABASE_NAME:-uwazi_development}"

    echo "Running migrations and reindexing..."
    yarn migrate
    yarn reindex

    echo "Demo data setup complete."
    exit 0

elif [ "$MIGRATE_AND_REINDEX" = "true" ]; then
    echo "Applying migrations and reindexing..."
    NODE_ENV=production DATABASE_NAME=$DATABASE_NAME INDEX_NAME=$INDEX_NAME FILES_ROOT_PATH=$FILES_ROOT_PATH yarn migrate-and-reindex
    echo "Migrations and reindexing complete."
    exit 0

else
    echo "No initialization flags set. Assuming MongoDB and Elasticsearch are already initialized."
fi

# Ensure correct permissions
if [ "$(id -u)" -ne 0 ]; then
    chown -R "$(id -u):$(id -g)" /uwazi
fi

# Start the Uwazi server in production mode
echo "Starting Uwazi server..."
DATABASE_NAME=${DATABASE_NAME} INDEX_NAME=$INDEX_NAME NODE_ENV=production FILES_ROOT_PATH=$FILES_ROOT_PATH yarn run-production
