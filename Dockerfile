# Use Node.js as the base image
FROM node:20-bullseye AS build

# Install necessary OS packages, MongoDB 5 tools, then clean up
RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory and copy Uwazi source code
WORKDIR /workspace
COPY . .

# Install dependencies and build the application
RUN yarn install && yarn production-build


FROM node:20-bullseye

ENV NODE_ENV=production
# Set the version of MongoDB Database Tools
ENV MONGO_TOOLS_VERSION=100.10.0

# Install MongoDB Database Tools and MongoDB Shell for MongoDB 5
RUN wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-x86_64-${MONGO_TOOLS_VERSION}.deb && \
    apt install -y ./mongodb-database-tools-debian11-x86_64-${MONGO_TOOLS_VERSION}.deb && \
    rm -f mongodb-database-tools-debian11-x86_64-${MONGO_TOOLS_VERSION}.deb && \
    wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg && \
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/5.0 main" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list && \
    apt-get update && apt-get install -y mongodb-mongosh && \
    rm -rf /var/lib/apt/lists/*


# Create a non-root user
RUN useradd -m uwazi-user
WORKDIR /uwazi/
COPY --from=build --chown=uwazi-user /workspace/prod/ .
COPY docker-entrypoint.sh docker-entrypoint.sh
RUN chown -R uwazi-user:uwazi-user /uwazi && chmod u+x docker-entrypoint.sh

USER uwazi-user


# Expose ports
EXPOSE 3000

# Set the default entrypoint and command for the container
ENTRYPOINT ["./docker-entrypoint.sh"]
