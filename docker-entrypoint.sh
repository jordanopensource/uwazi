#!/bin/bash
DB_INITIALIZATION_PATH="${DB_INITIALIZATION_PATH:-"/uwazi/database/blank_state/uwazi_development"}"
# DB_INITIALIZATION_PATH_DEMO="/uwazi/uwazi-fixtures/dump/uwazi_development"

env

# NOTE: the costumization of "UWAZI_GIT_RELEASE_REF" for something beyond "production" needs testing.
echo "Uwazi ($UWAZI_GIT_RELEASE_REF)($NODE_ENV)"

## Database
echo "Database Host: $DATABASE_HOST"
echo "Database Name: $DATABASE_NAME"
echo "DB_INITIALIZATION_PATH: $DB_INITIALIZATION_PATH"

## Elasticsearch
echo "Elastic Host: $ELASTICSEARCH_URL"
echo "Elastic Index: $INDEX_NAME"

## Uwazi
echo "IS_FIRST_RUN: $IS_FIRST_RUN"
echo "IS_FIRST_DEMO_RUN: $IS_FIRST_DEMO_RUN"
echo "MIGRATE_AND_REINDEX: $MIGRATE_AND_REINDEX"

if [ "$IS_FIRST_RUN" = "true" ]; then
    echo "uwazi: Enviroment variable IS_FIRST_RUN is true. Assuming need to install database from blank state"

    # echo "uwazi-docker: Deleting ${DATABASE_HOST:-mongo} ${DATABASE_NAME:-uwazi_development} MongoDB database"
    # mongo -host ${DBHOST:-mongo} ${DATABASE_NAME:-uwazi_development} --eval "db.dropDatabase()"
    # mongosh -host "${DATABASE_HOST:-mongo}" "${DATABASE_NAME:-uwazi_development}" --eval "db.dropDatabase()"

    # echo "uwazi-docker: Importing $DB_INITIALIZATION_PATH to ${DATABASE_HOST:-mongo} ${DATABASE_NAME:-uwazi_development} MongoDB database"
    # mongorestore -h "${DATABASE_HOST:-mongo}" "$DB_INITIALIZATION_PATH" --db="${DATABASE_NAME:-uwazi_development}"

    NODE_ENV=production DBHOST=$DATABASE_HOST yarn blank-state $DATABASE_NAME

    # echo "node: Applyng yarn reindex. This will use data from MongoDB to feed Elastic Search"

    # yarn migrate
    # yarn migrate

    # yarn reindex
    # yarn reindex

    echo "Uwazi: If no fatal errors occurred, you will never need to use this command again"
    exit 0

elif [ "$IS_FIRST_DEMO_RUN" = "true" ]; then
    echo "uwazi-docker: Enviroment variable IS_FIRST_DEMO_RUN is true. Assuming need to install database from blank state"

    echo "uwazi-docker: Restoring pdfs..."
    rm ./uploaded_documents/*
    cp ./uwazi-fixtures/uploaded_documents/* ./uploaded_documents/

    echo "uwazi-docker: Deleting ${DBHOST:-mongo} ${DATABASE_NAME:-uwazi_development} MongoDB database"
    # mongo -host ${DBHOST:-mongo} ${DATABASE_NAME:-uwazi_development} --eval "db.dropDatabase()"
    mongosh -host "${DBHOST:-mongo}" "${DATABASE_NAME:-uwazi_development}" --eval "db.dropDatabase()"

    echo "uwazi-docker: Importing $DB_INITIALIZATION_PATH_DEMO to ${DBHOST:-mongo} ${DATABASE_NAME:-uwazi_development} MongoDB database"
    mongorestore -h "${DBHOST:-mongo}" "$DB_INITIALIZATION_PATH_DEMO" --db="${DATABASE_NAME:-uwazi_development}"

    echo "uwazi-docker: Applyng yarn reindex. This will use data from MongoDB to feed Elastic Search"
    # yarn reindex
    yarn migrate
    yarn reindex

    echo "uwazi-docker: If no fatal errors occurred, you will never need to use this command again"
    exit 0

elif [ "$MIGRATE_AND_REINDEX" = "true" ]; then
    echo "uwazi-docker: Applyng yarn reindex. This will use data from MongoDB to feed Elastic Search"
    DBHOST=$DATABASE_HOST NODE_ENV=$NODE_ENV DATABASE_NAME=$DATABASE_NAME INDEX_NAME=$INDEX_NAME DBHOST=$DATABASE_HOST yarn migrate-and-reindex

    echo "uwazi-docker: If no fatal errors occurred, you will not need to use this command again unless data needs update to run with newer Uwazi or database version"
    exit 0
else
    echo "uwazi-docker: Enviroment variable IS_FIRST_RUN/RUN_YARN_MIGRATE_REINDEX are not true."
    echo "uwazi-docker: Assume MongoDB and Elastic Search provide already are intialized."
    echo "uwazi-docker: [protip] is possible to initialize (or reset o initial state) MongoDB and Elastic Search with enviroment variable IS_FIRST_RUN=true"
fi

chown -R $USER:$USER /uwazi

echo "node: Starting Uwazi..."
DBHOST=$DATABASE_HOST HOST=$HOST yarn run-production
