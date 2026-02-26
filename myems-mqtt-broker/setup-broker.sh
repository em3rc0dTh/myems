#!/bin/bash

# =================================================================
# 🛡️ MyEMS MQTT Broker Setup Script
# Generates TLS certificates and password file for Mosquitto Docker
# =================================================================

set -e

# Directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_DIR="$DIR/config"
CERTS_DIR="$CONFIG_DIR/certs"

echo "🔐 Step 1: Generating SSL/TLS Certificates..."
mkdir -p "$CERTS_DIR"

# Generate CA
openssl req -new -x509 -days 3650 -extensions v3_ca -keyout "$CERTS_DIR/ca.key" -out "$CERTS_DIR/ca.crt" -nodes -subj "/CN=MyEMS-Internal-CA"

# Generate Server Cert
openssl genrsa -out "$CERTS_DIR/server.key" 2048
# We use 'broker' as the hostname because inside docker-compose the service is named 'broker'
openssl req -new -out "$CERTS_DIR/server.csr" -key "$CERTS_DIR/server.key" -subj "/CN=broker"
openssl x509 -req -in "$CERTS_DIR/server.csr" -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial -out "$CERTS_DIR/server.crt" -days 3650

echo "👥 Step 2: Configuring Users..."
# We use a temporary container to run mosquitto_passwd since it might not be installed on the host
# This ensures the password file is generated with the correct hashing
docker run --rm -v "$CONFIG_DIR:/mosquitto/config" eclipse-mosquitto:latest \
    sh -c "touch /mosquitto/config/passwd && \
           mosquitto_passwd -b /mosquitto/config/passwd th-testing-2w 'Aa12345678@@' && \
           mosquitto_passwd -b /mosquitto/config/passwd th-testing-pub 'Aa12345678@@' && \
           mosquitto_passwd -b /mosquitto/config/passwd th-testing-sub 'Aa12345678@@'"

echo "🔒 Step 3: Setting Permissions..."
chmod 644 "$CONFIG_DIR/mosquitto.conf"
chmod 644 "$CONFIG_DIR/passwd"
chmod 644 "$CERTS_DIR/ca.crt"
chmod 644 "$CERTS_DIR/server.crt"
chmod 600 "$CERTS_DIR/server.key"

echo "✅ Setup Complete!"
echo "Now you can start MyEMS with: sudo docker-compose up -d"
