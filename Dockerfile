# Stage 1: Build Stage
FROM node:20-slim AS build

# Install necessary OS packages
RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory and install dependencies
WORKDIR /workspace

# Copy only package files to leverage Docker cache
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy source files and build the application
COPY . .
RUN yarn production-build

# Stage 2: Runtime Stage
FROM node:20-slim

# Set environment variables
ENV NODE_ENV=production
ENV MONGO_TOOLS_VERSION=100.10.0

# Install curl, gnupg, MongoDB Database Tools, and MongoDB Shell for MongoDB 5
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -O https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-x86_64-${MONGO_TOOLS_VERSION}.deb \
    && apt install -y ./mongodb-database-tools-debian11-x86_64-${MONGO_TOOLS_VERSION}.deb \
    && rm -f mongodb-database-tools-debian11-x86_64-${MONGO_TOOLS_VERSION}.deb \
    && curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/5.0 main" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list \
    && apt-get update && apt-get install -y mongodb-mongosh \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and set permissions for Uwazi
RUN useradd -m uwazi-user
WORKDIR /uwazi

# Copy built files from build stage
COPY --from=build --chown=uwazi-user /workspace/prod/ .

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod u+x docker-entrypoint.sh

# Switch to non-root user
USER uwazi-user

# Expose port and set default entrypoint
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
