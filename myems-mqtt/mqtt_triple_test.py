import paho.mqtt.client as mqtt
import time
import threading
import ssl

HOST = "8923943591554066b0cd5949b62311ee.s1.eu.hivemq.cloud"
PORT = 8883
PASSWORD = "Aa12345678@@"
USERS = [
    {"username": "th-testing-pub", "can_pub": True, "can_sub": False},
    {"username": "th-testing-sub", "can_pub": False, "can_sub": True},
    {"username": "th-testing-2w", "can_pub": True, "can_sub": True},
]
TOPIC = "myems/test/data"


def on_connect(client, userdata, flags, rc, properties=None):
    username = userdata["username"]
    if rc == 0:
        print(f"[SUCCESS] {username} connected.", flush=True)
        if userdata["can_sub"]:
            client.subscribe(TOPIC)
            client.subscribe("myems/#")
            print(f"[{username}] Subscribed to {TOPIC} and myems/#", flush=True)
    else:
        print(f"[FAILED] {username} connection failed with code {rc}", flush=True)


def on_message(client, userdata, msg):
    username = userdata["username"]
    print(
        f"[{username} RECEIVED] Topic: {msg.topic}, Payload: {msg.payload.decode()}",
        flush=True,
    )


def run_client(user_info):
    username = user_info["username"]
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2, userdata=user_info
    )
    client.username_pw_set(username, PASSWORD)
    client.tls_set()
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(HOST, PORT, 60)
        client.loop_start()

        while True:
            if user_info["can_pub"]:
                msg = f" {username} at {time.ctime()}"
                client.publish(TOPIC, msg)
            time.sleep(15)
    except Exception as e:
        print(f"[{username} ERROR] {e}", flush=True)
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    threads = []
    print(f"Starting connection to {HOST}...", flush=True)
    for user in USERS:
        t = threading.Thread(target=run_client, args=(user,))
        t.daemon = True
        t.start()
        threads.append(t)

    print("All 3 clients are running. Monitoring MQTT activity...\n", flush=True)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping...", flush=True)
