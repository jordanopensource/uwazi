ARG BUILD_PLATFORM=linux/amd64
FROM --platform=${BUILD_PLATFORM} node:20-bookworm AS build
# Installing libvips-dev for sharp Compatibility\
## Install common software
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y \
    bzip2 \
    dh-autoreconf \
    git \
    libpng-dev \
    curl \
    gnupg \
    poppler-utils \
    apt-transport-https \
    build-essential \
    ca-certificates \
    curl \
    git \
    libssl-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# Install mongo & mongorestore (this is used only for database initialization, not on runtime)
# So much space need, see 'After this operation, 184 MB of additional disk space will be used.'
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
    --dearmor

RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY src .
RUN yarn install
RUN yarn production-build

FROM --platform=${BUILD_PLATFORM} node:20-bookworm

# ARG UWAZI_GIT_RELEASE_REF=production
ENV NODE_ENV=production USER=1001

## Install common software
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y \
    bzip2 \
    dh-autoreconf \
    git \
    libpng-dev \
    curl \
    gnupg \
    poppler-utils \
    apt-transport-https \
    build-essential \
    ca-certificates \
    curl \
    git \
    libssl-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev
# Install mongo & mongorestore (this is used only for database initialization, not on runtime)
# So much space need, see 'After this operation, 184 MB of additional disk space will be used.'
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
    --dearmor

RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /uwazi/
COPY --from=build --chown=${USER} /workspace/prod/ .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod u+x /docker-entrypoint.sh
RUN echo $DBHOST
# USER ${USER}
ENTRYPOINT ["/docker-entrypoint.sh"]
