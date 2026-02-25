import paho.mqtt.client as mqtt
import time
import ssl

HOST = "8923943591554066b0cd5949b62311ee.s1.eu.hivemq.cloud"
PORT = 8883
PASSWORD = "Aa12345678@@"
USERS = ["th-testing-pub", "th-testing-sub", "th-testing-2w"]
TOPIC = "myems/test/data"


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[SUCCESS] Connected as {userdata}")
        client.subscribe(TOPIC)
        print(f"Subscribed to {TOPIC}")
    else:
        print(f"[FAILED] Connection failed for {userdata} with code {rc}")


def on_message(client, userdata, msg):
    print(f"[RECEIVED] Topic: {msg.topic}, Payload: {msg.payload.decode()}")


def test_user(username):
    print(f"\n--- Testing User: {username} ---")
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2, userdata=username
    )
    client.username_pw_set(username, PASSWORD)
    client.tls_set()
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(HOST, PORT, 60)
        client.loop_start()

        # Publish a test message as the user
        time.sleep(2)
        print(f"Publishing test message as {username}...")
        client.publish(TOPIC, f"Hello from {username}")

        time.sleep(3)
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    for user in USERS:
        test_user(user)
    print("\nAll tests completed.")
