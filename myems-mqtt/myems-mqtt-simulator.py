import json
import random
import time
from datetime import datetime
import paho.mqtt.client as mqtt

BROKER = "127.0.0.1"
PORT = 1883
TOPIC_PUBLISH = "myems/device1/data"
TOPIC_SUBSCRIBE = "myems/device1/command"
USERNAME = "admin"
PASSWORD = "!MyEMS123"

# MQTT connection callbacks
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ Connected to MQTT broker")
        client.subscribe(TOPIC_SUBSCRIBE)
        print(f"📡 Subscribed to topic: {TOPIC_SUBSCRIBE}")
    else:
        print("❌ Connection failed, code=", rc)

def on_message(client, userdata, msg):
    print(f"📨 Received command → {msg.topic}: {msg.payload.decode()}")
    # Simulate executing a command (like turning a relay on/off)
    print("⚙️  Executing command...")
    time.sleep(1)
    print("✅ Command done.\n")

# Create MQTT client
client = mqtt.Client(client_id="simulated_device1", protocol=mqtt.MQTTv5)
client.username_pw_set(USERNAME, PASSWORD)
client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, 60)
client.loop_start()

# Simulate sensor readings (publishing)
try:
    while True:
        payload = {
            "device_id": "device1",
            "point_id": 1,
            "utc_date_time": datetime.utcnow().isoformat(),
            "value": round(random.uniform(20, 30), 2)  # fake temperature
        }
        client.publish(TOPIC_PUBLISH, json.dumps(payload), qos=0, retain=False)
        print(f"📤 Published → {TOPIC_PUBLISH}: {payload}")
        time.sleep(3)
except KeyboardInterrupt:
    print("🛑 Stopped simulator")
    client.disconnect()
