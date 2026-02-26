from decouple import config

# MQTT Broker (shared with MyEMS API)
myems_mqtt_broker = {
    "host": config("MYEMS_MQTT_BROKER_HOST", default="127.0.0.1"),
    "port": config("MYEMS_MQTT_BROKER_PORT", default=1883, cast=int),
    "username": config("MYEMS_MQTT_BROKER_USERNAME", default="admin"),
    "password": config("MYEMS_MQTT_BROKER_PASSWORD", default="!MyEMS123"),
    "use_tls": config("MYEMS_MQTT_BROKER_USE_TLS", default=False, cast=bool),
}

# System database
myems_system_db = {
    "user": config("MYEMS_SYSTEM_DB_USER", default="myems_user"),
    "password": config("MYEMS_SYSTEM_DB_PASSWORD", default="myems_pass"),
    "host": config("MYEMS_SYSTEM_DB_HOST", default="127.0.0.1"),
    "database": config("MYEMS_SYSTEM_DB_DATABASE", default="myems_system_db"),
    "raise_on_warnings": True,
}

# Topic patterns
mqtt_topics = {
    "data": "myems/+/data",  # incoming sensor data
    "ack": "myems/+/ack",  # device acknowledgments
}

# Interval (how long to wait between readings/checks)
interval_in_seconds = config("INTERVAL_IN_SECONDS", default=10, cast=int)
