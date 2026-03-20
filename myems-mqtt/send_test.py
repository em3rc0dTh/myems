import paho.mqtt.client as mqtt
import time
import json

# Configuración de tu VM
BROKER_IP = "165.1.124.248"
PORT = 1883
USER = "th-testing-2w"
PASSWORD = "Aa12345678@@"


def send_test_message():
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(USER, PASSWORD)

    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            print("✅ Conexión establecida correctamente.")
        else:
            print(f"❌ Falla en la conexión (RC: {rc})")

    client.on_connect = on_connect

    try:
        print(f"🔄 Intentando conectar a {BROKER_IP}:{PORT}...")
        # Aumentamos el keepalive y timeout para dar tiempo al handshake SSL
        client.connect(BROKER_IP, PORT, 60)
        client.loop_start()

        # Esperar un poco a que el handshake termine
        time.sleep(2)

        # El payload DEBE ser un JSON con IDs que existan en tu MyEMS
        payload = {
            "data_source_id": 1,
            "point_id": 1,
            "value": 99.9,  # Un valor alto para que lo veas fácil en el dashboard
        }

        topic = "myems/test/data"
        print(f"📤 Publicando en {topic}...")
        result = client.publish(topic, json.dumps(payload), qos=1)

        # Esperar a que se confirme el envío
        result.wait_for_publish(timeout=5)

        if result.is_published():
            print(f"✅ ¡Mensaje publicado con éxito!")
        else:
            print("⚠️ El mensaje no pudo confirmarse como publicado.")

        time.sleep(1)
        client.loop_stop()
        client.disconnect()

    except Exception as e:
        print(f"❌ Error durante la ejecución: {e}")


if __name__ == "__main__":
    send_test_message()
