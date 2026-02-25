import time
import paho.mqtt.client as mqtt
import config

connected_flag = False


def on_connect(client, userdata, flags, rc, properties=None):
    global connected_flag
    if rc == 0:
        connected_flag = True
        print("[MQTT] Connected to broker")
        client.subscribe(config.mqtt_topics["data"])
        client.subscribe(config.mqtt_topics["ack"])
    else:
        print("[MQTT] Connection failed with code", rc)


def on_disconnect(client, userdata, flags, rc, properties=None):
    global connected_flag
    connected_flag = False
    print("[MQTT] Disconnected with code", rc)


def on_message(client, userdata, msg):
    from acquisition import handle_message

    handle_message(msg.topic, msg.payload)


def process(logger):
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(
        config.myems_mqtt_broker["username"], config.myems_mqtt_broker["password"]
    )
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    if config.myems_mqtt_broker["use_tls"]:
        client.tls_set()

    client.connect(
        config.myems_mqtt_broker["host"], config.myems_mqtt_broker["port"], 60
    )
    client.loop_start()

    while True:
        if not connected_flag:
            logger.error("[MQTT] Disconnected, retrying...")
            time.sleep(10)
        time.sleep(config.interval_in_seconds)
