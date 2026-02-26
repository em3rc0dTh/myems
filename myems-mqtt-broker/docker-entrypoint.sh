#!/bin/ash
set -e

CONFIG_DIR="/mosquitto/config"
CERTS_DIR="$CONFIG_DIR/certs"
PASSWD_FILE="$CONFIG_DIR/passwd"

# 1. Generate Certificates if they don't exist
if [ ! -f "$CERTS_DIR/ca.crt" ]; then
    echo "🔐 Generating SSL/TLS Certificates..."
    mkdir -p "$CERTS_DIR"
    openssl req -new -x509 -days 3650 -extensions v3_ca -keyout "$CERTS_DIR/ca.key" -out "$CERTS_DIR/ca.crt" -nodes -subj "/CN=MyEMS-Internal-CA"
    openssl genrsa -out "$CERTS_DIR/server.key" 2048
    openssl req -new -out "$CERTS_DIR/server.csr" -key "$CERTS_DIR/server.key" -subj "/CN=broker"
    openssl x509 -req -in "$CERTS_DIR/server.csr" -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial -out "$CERTS_DIR/server.crt" -days 3650
    chmod 644 "$CERTS_DIR/ca.crt" "$CERTS_DIR/server.crt"
    chmod 600 "$CERTS_DIR/server.key"
fi

# 2. Setup Password File
echo "👥 Setting up users from environment variables..."
touch "$PASSWD_FILE"
# Create the main admin user from environment variables
if [ -n "$MQTT_USER" ] && [ -n "$MQTT_PASSWORD" ]; then
    mosquitto_passwd -b "$PASSWD_FILE" "$MQTT_USER" "$MQTT_PASSWORD"
    echo "✅ User '$MQTT_USER' configured."
fi

# Optional: Keep the testing users for backward compatibility or remove them
mosquitto_passwd -b "$PASSWD_FILE" th-testing-2w "Aa12345678@@"
chmod 644 "$PASSWD_FILE"

# 3. Ensure permissions are correct for Mosquitto
chown -R mosquitto:mosquitto /mosquitto

# Execute the CMD
exec "$@"
