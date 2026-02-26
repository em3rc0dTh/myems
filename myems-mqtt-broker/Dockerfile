FROM eclipse-mosquitto:latest

# Install openssl to generate certs if needed
RUN apk add --no-cache openssl

# Create directories
RUN mkdir -p /mosquitto/config/certs /mosquitto/data /mosquitto/log

# Copy configuration
COPY config/mosquitto.conf /mosquitto/config/mosquitto.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 1883 8883

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
