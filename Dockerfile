ARG BUILD_PLATFORM=amd64
FROM --platform=${BUILD_PLATFORM} node:20-bullseye AS build
# Installing libvips-dev for sharp Compatibility
WORKDIR /tmp/
COPY ./package.json ./yarn.lock ./
RUN yarn config set network-timeout 600000 -g && yarn install

FROM --platform=${BUILD_PLATFORM} node:20-bullseye

# ARG UWAZI_GIT_RELEASE_REF=production
ENV NODE_ENV=production USER=1001

# ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:/opt/X11/lib/pkgconfig
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
    --dearmor

RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /uwazi/
COPY --from=build /tmp/node_modules ./node_modules
COPY . .
RUN yarn production-build
COPY --chown=${USER} docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod u+x /docker-entrypoint.sh
# COPY --chown=${USER}:${USER} docker-entrypoint.sh /docker-entrypoint.sh
# USER ${USER}
# ENTRYPOINT ["sleep"]
# CMD ["infinity"]
ENTRYPOINT ["/docker-entrypoint.sh"]
# CMD ["/bin/bash", "-c", "tail -f /dev/null"]