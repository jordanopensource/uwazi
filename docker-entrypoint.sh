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
echo "First Run: $IS_FIRST_RUN"
echo "Demo Run: $IS_FIRST_DEMO_RUN"
echo "Migrate and Reindex: $MIGRATE_AND_REINDEX"
export DBHOST=$DATABASE_HOST

# Function to check if MongoDB is ready and accessible
wait_for_mongo() {
  echo "Waiting for MongoDB to be ready..."
  until mongosh --host "${DBHOST:-mongo}" --eval "db.adminCommand('ping')" &>/dev/null; do
    echo "MongoDB is not ready yet. Retrying in 5 seconds..."
    sleep 5
  done
  echo "MongoDB is ready."
}

# Function to check if Elasticsearch is ready and accessible
wait_for_elasticsearch() {
  echo "Waiting for Elasticsearch to be ready..."
  until curl -s "${ELASTICSEARCH_URL:-http://elasticsearch:9200}" &>/dev/null; do
    echo "Elasticsearch is not ready yet. Retrying in 5 seconds..."
    sleep 5
  done
  echo "Elasticsearch is ready."
}

# Wait for both MongoDB and Elasticsearch to be ready before proceeding
wait_for_mongo
wait_for_elasticsearch

# Ensure the 'uploaded_documents' directory exists for storing document uploads
mkdir -p ./uploaded_documents

# Conditional initialization of the database based on flags
if [ "$IS_FIRST_RUN" = "true" ]; then
    # Initialize the database with a blank state if it's the first run
    echo "Initializing MongoDB database from blank state..."
    NODE_ENV=production yarn blank-state $DATABASE_NAME
    echo "Initial database setup complete."
    exit 0  # Exit once the initial setup is complete

elif [ "$IS_FIRST_DEMO_RUN" = "true" ]; then
    # Set up the database with demo data if it's the first demo run
    echo "Setting up MongoDB with demo data..."

    # Restore the PDF documents to the 'uploaded_documents' directory
    echo "Restoring PDF documents..."
    rm -rf ./uploaded_documents/*  # Clean the existing documents folder
    cp -r ./uwazi-fixtures/uploaded_documents/* ./uploaded_documents/  # Copy demo documents

    # Drop the existing database and replace it with demo data
    echo "Dropping existing database: ${DATABASE_NAME}"
    mongosh --host "${DBHOST:-mongo}" "${DATABASE_NAME:-uwazi_development}" --eval "db.dropDatabase()"

    # Restore the demo database
    echo "Importing demo data..."
    mongorestore -h "${DBHOST:-mongo}" "$DB_INITIALIZATION_PATH_DEMO" --db="${DATABASE_NAME:-uwazi_development}"

    # Run necessary migrations and reindex the data for the demo
    echo "Running migrations and reindexing..."
    yarn migrate
    yarn reindex

    echo "Demo data setup complete."
    exit 0  # Exit once the demo setup is complete

elif [ "$MIGRATE_AND_REINDEX" = "true" ]; then
    # Apply migrations and reindex if the respective flag is set
    echo "Applying migrations and reindexing..."
    NODE_ENV=production DATABASE_NAME=$DATABASE_NAME INDEX_NAME=$INDEX_NAME FILES_ROOT_PATH=$FILES_ROOT_PATH yarn migrate-and-reindex
    echo "Migrations and reindexing complete."
    exit 0  # Exit once migrations and reindexing are complete

else
    # No initialization flags set, assuming services are already set up
    echo "No initialization flags set. Assuming MongoDB and Elasticsearch are already initialized."
fi

# Ensure that the correct permissions are set for the Uwazi directory
if [ "$(id -u)" -ne 0 ]; then
    echo "Adjusting directory permissions..."
    chown -R uwazi-user:uwazi-user /uwazi
fi

# Start the Uwazi server in production mode
echo "Starting Uwazi server..."
DATABASE_NAME=${DATABASE_NAME} INDEX_NAME=$INDEX_NAME NODE_ENV=production FILES_ROOT_PATH=$FILES_ROOT_PATH yarn run-production
