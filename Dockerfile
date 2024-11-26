# Stage 1: Build Stage
FROM node:20-slim AS build

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

# Install required packages, MongoDB tools, MongoDB Shell, and pdftotext (Poppler)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    poppler-utils \
    && curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list \
    && apt-get update && apt-get install -y \
       mongodb-mongosh \
       mongodb-database-tools \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and set permissions for Uwazi
RUN useradd -m uwazi-user
WORKDIR /uwazi

# Copy built files from build stage
COPY --from=build --chown=uwazi-user /workspace/prod/ .

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chown -R uwazi-user:uwazi-user /uwazi && chmod u+x docker-entrypoint.sh

# Switch to non-root user
USER uwazi-user

# Expose port and set default entrypoint
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
