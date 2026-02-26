import time
import paho.mqtt.client as mqtt
import config
import logging
import ssl

connected_flag = False
logger = logging.getLogger("myems-mqtt")


def on_log(client, userdata, level, buf):
    logger.debug(f"[MQTT LOG] {buf}")


def on_connect(client, userdata, flags, rc, properties=None):
    global connected_flag
    if rc == 0:
        connected_flag = True
        logger.info("[MQTT] Connected to broker successfully")
        client.subscribe(config.mqtt_topics["data"])
        client.subscribe(config.mqtt_topics["ack"])
        logger.info(f"[MQTT] Subscribed to topics: {list(config.mqtt_topics.values())}")
    else:
        connected_flag = False
        logger.error(f"[MQTT] Connection failed with reason code: {rc}")


def on_disconnect(client, userdata, flags, rc, properties=None):
    global connected_flag
    connected_flag = False
    if rc != 0:
        logger.warning(
            f"[MQTT] Unexpected disconnection with reason code: {rc}. Retrying..."
        )
    else:
        logger.info("[MQTT] Disconnected from broker")


def on_message(client, userdata, msg):
    from acquisition import handle_message

    try:
        logger.info(f"[MQTT] Received message on topic: {msg.topic}")
        handle_message(msg.topic, msg.payload)
    except Exception as e:
        logger.error(f"[MQTT] Error in handle_message: {e}")


def process(external_logger):
    global logger
    logger = external_logger

    client_id = f"myems_mqtt_gateway_{int(time.time())}"
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id,
        protocol=mqtt.MQTTv5,
    )

    client.username_pw_set(
        config.myems_mqtt_broker["username"], config.myems_mqtt_broker["password"]
    )
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    client.on_log = on_log

    if config.myems_mqtt_broker["use_tls"]:
        logger.info("[MQTT] Using TLS for connection")
        # For HiveMQ Cloud, default settings are usually sufficient,
        # but we ensure we use a secure protocol.
        client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)

    logger.info(
        f"[MQTT] Attempting to connect to {config.myems_mqtt_broker['host']}:{config.myems_mqtt_broker['port']} as {client_id}"
    )

    connected_initially = False
    while not connected_initially:
        try:
            # We use a blocking connect for the very first time to ensure parameters are valid,
            # then start the loop.
            client.connect(
                config.myems_mqtt_broker["host"], config.myems_mqtt_broker["port"], 60
            )
            connected_initially = True
        except Exception as e:
            logger.error(
                f"[MQTT] Could not establish initial connection: {e}. Retrying in 10s..."
            )
            time.sleep(10)

    client.loop_start()

    while True:
        if not connected_flag:
            # We don't sleep too long here if we are disconnected,
            # as paho-mqtt handles the actual reconnection in the background.
            # We just log the status periodically.
            logger.warning(
                "[MQTT] Currently disconnected. Waiting for auto-reconnect..."
            )
            time.sleep(30)
        else:
            time.sleep(config.interval_in_seconds)
