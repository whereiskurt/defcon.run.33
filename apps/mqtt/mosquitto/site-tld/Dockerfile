## Downloaded the mosquitto source code and build it from:
## https://github.com/eclipse-mosquitto/mosquitto/blob/master/docker/2.0-openssl/Dockerfile
## 

##FROM alpine:3.20 AS mosquitto-layer
FROM debian:bullseye-slim AS mosquitto-layer

LABEL maintainer="Roger Light <roger@atchoo.org>" \
    description="Eclipse Mosquitto MQTT Broker"

ENV VERSION=2.0.20 \
    DOWNLOAD_SHA256=ebd07d89d2a446a7f74100ad51272e4a8bf300b61634a7812e19f068f2759de8 \
    GPG_KEYS=A0D6EEA1DCAE49A635A3B2F0779B22DFB3E717B7 \
    LWS_VERSION=4.2.1 \
    LWS_SHA256=842da21f73ccba2be59e680de10a8cce7928313048750eb6ad73b6fa50763c51

RUN set -x && \
    apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    gnupg \
    gpg \
    build-essential \
    cmake \
    protobuf-c-compiler \
    libc-dev \
    libcjson-dev \
    libssl-dev && \
    wget https://github.com/warmcat/libwebsockets/archive/v${LWS_VERSION}.tar.gz -O /tmp/lws.tar.gz && \
    echo "$LWS_SHA256  /tmp/lws.tar.gz" | sha256sum -c - && \
    mkdir -p /build/lws && \
    tar --strip=1 -xf /tmp/lws.tar.gz -C /build/lws && \
    rm /tmp/lws.tar.gz && \
    cd /build/lws && \
    cmake . \
        -DCMAKE_BUILD_TYPE=MinSizeRel \
        -DCMAKE_INSTALL_PREFIX=/usr \
        -DDISABLE_WERROR=ON \
        -DLWS_IPV6=ON \
        -DLWS_WITHOUT_BUILTIN_GETIFADDRS=ON \
        -DLWS_WITHOUT_CLIENT=ON \
        -DLWS_WITHOUT_EXTENSIONS=ON \
        -DLWS_WITHOUT_TESTAPPS=ON \
        -DLWS_WITH_EXTERNAL_POLL=ON \
        -DLWS_WITH_HTTP2=OFF \
        -DLWS_WITH_SHARED=OFF \
        -DLWS_WITH_ZIP_FOPS=OFF \
        -DLWS_WITH_ZLIB=OFF && \
    make -j "$(nproc)" && \
    rm -rf /root/.cmake && \
    wget https://mosquitto.org/files/source/mosquitto-${VERSION}.tar.gz -O /tmp/mosq.tar.gz && \
    echo "$DOWNLOAD_SHA256  /tmp/mosq.tar.gz" | sha256sum -c - && \
    wget https://mosquitto.org/files/source/mosquitto-${VERSION}.tar.gz.asc -O /tmp/mosq.tar.gz.asc && \
    export GNUPGHOME="$(mktemp -d)" && \
    found=''; \
    for server in \
        hkps://keys.openpgp.org \
        hkp://keyserver.ubuntu.com:80 \
        pgp.mit.edu \
    ; do \
        echo "Fetching GPG key $GPG_KEYS from $server"; \
        gpg --keyserver "$server" --keyserver-options timeout=10 --recv-keys "$GPG_KEYS" && found=yes && break; \
    done; \
    test -z "$found" && echo >&2 "error: failed to fetch GPG key $GPG_KEYS" && exit 1; \
    gpg --batch --verify /tmp/mosq.tar.gz.asc /tmp/mosq.tar.gz && \
    gpgconf --kill all && \
    rm -rf "$GNUPGHOME" /tmp/mosq.tar.gz.asc && \
    mkdir -p /build/mosq && \
    tar --strip=1 -xf /tmp/mosq.tar.gz -C /build/mosq && \
    rm /tmp/mosq.tar.gz && \
    make -C /build/mosq -j "$(nproc)" \
        CFLAGS="-Wall -O2 -I/build/lws/include -I/build/nanopb -I/build" \
        LDFLAGS="-L/build/lws/lib -L/usr/lib" \
        WITH_ADNS=no \
        WITH_DOCS=no \
        WITH_SHARED_LIBRARIES=yes \
        WITH_SRV=no \
        WITH_STRIP=yes \
        WITH_WEBSOCKETS=yes \
        prefix=/usr \
        binary && \
    #addgroup --system -g 1883 mosquitto 2>/dev/null && \
    #adduser --system -u 1883 -D -H -h /var/empty -s /sbin/nologin -G mosquitto -g mosquitto mosquitto 2>/dev/null && \
    #adduser --system --uid 1883 --no-create-home --home /var/empty --shell /sbin/nologin --ingroup mosquitto --gecos mosquitto mosquitto 2>/dev/null && \
    #adduser --system --uid 1883 --ingroup mosquitto mosquitto 2>/dev/null && \
    addgroup mosquitto 2>/dev/null && \
    adduser --ingroup mosquitto mosquitto 2>/dev/null && \
    mkdir -p /mosquitto/config /mosquitto/data /mosquitto/log && \
    install -d /usr/sbin/ && \
    install -s -m755 /build/mosq/client/mosquitto_pub /usr/bin/mosquitto_pub && \
    install -s -m755 /build/mosq/client/mosquitto_rr /usr/bin/mosquitto_rr && \
    install -s -m755 /build/mosq/client/mosquitto_sub /usr/bin/mosquitto_sub && \
    install -s -m644 /build/mosq/lib/libmosquitto.so.1 /usr/lib/libmosquitto.so.1 && \
    install -s -m755 /build/mosq/src/mosquitto /usr/sbin/mosquitto && \
    install -s -m755 /build/mosq/apps/mosquitto_ctrl/mosquitto_ctrl /usr/bin/mosquitto_ctrl && \
    install -s -m755 /build/mosq/apps/mosquitto_passwd/mosquitto_passwd /usr/bin/mosquitto_passwd && \
    install -s -m755 /build/mosq/plugins/dynamic-security/mosquitto_dynamic_security.so /usr/lib/mosquitto_dynamic_security.so && \
    install -m644 /build/mosq/mosquitto.conf /mosquitto/config/mosquitto.conf && \
    install -Dm644 /build/lws/LICENSE /usr/share/licenses/libwebsockets/LICENSE && \
    install -Dm644 /build/mosq/epl-v20 /usr/share/licenses/mosquitto/epl-v20 && \
    install -Dm644 /build/mosq/edl-v10 /usr/share/licenses/mosquitto/edl-v10 && \
    chown -R mosquitto:mosquitto /mosquitto
    # apk --no-cache add \
    #     ca-certificates \
    #     cjson && \
    # apk del build-deps && \
    # rm -rf /build

VOLUME ["/mosquitto/data", "/mosquitto/log"]

EXPOSE 1883
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
    
FROM mosquitto-layer AS mosquitto-defcon-run

COPY --from=mosquitto-layer /build /build
COPY plugin/* /build/
# RUN apk add --no-cache bash curl jq netcat-openbsd python3 && \
RUN apt-get update && apt-get install -y bash curl jq netcat-openbsd python3 unzip && \
    wget https://github.com/protocolbuffers/protobuf/releases/download/v30.2/protoc-30.2-linux-x86_64.zip -O /tmp/protoc.zip && \
    unzip /tmp/protoc.zip -d /build && \
    export PATH="/build/bin:$PATH" && \
    wget https://github.com/nanopb/nanopb/archive/refs/tags/nanopb-0.4.6.tar.gz -O /tmp/nanopb.tar.gz && \
    mkdir -p /build/nanopb && \
    tar --strip=1 -xf /tmp/nanopb.tar.gz -C /build/nanopb && \
    rm /tmp/nanopb.tar.gz && \
    cd /build/nanopb && \
    cmake . \
        -DCMAKE_BUILD_TYPE=MinSizeRel \
        -DCMAKE_INSTALL_PREFIX=/usr && \
    make -j "$(nproc)" && \
    make install && \
    gcc -fPIC -lpthread -I/build/mosq/include -I/build/nanopb -shared -o /mosquitto/security_inspector.so \
        /build/security_inspector.c \
        /build/meshtastic_inspector.pb.c \
        /build/nanopb/pb_encode.c \
        /build/nanopb/pb_decode.c \
        /build/nanopb/pb_common.c 

# Set up the entry point script and default command
COPY mosquitto.conf /mosquitto/config/mosquitto.conf
COPY mosquitto.passwd /mosquitto/config/passwd
COPY mosquitto.acl /mosquitto/config/acl

## This addresses warning at startup and future breaking changes
RUN chmod 0700 /mosquitto/config/passwd
RUN chmod 0700 /mosquitto/config/acl

COPY docker-entrypoint.sh /

RUN chown -R mosquitto:mosquitto /mosquitto
