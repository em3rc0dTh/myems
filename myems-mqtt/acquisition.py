import json
import mysql.connector
import config

def handle_message(topic, payload):
    """Process incoming MQTT message."""
    try:
        data = json.loads(payload.decode('utf-8'))
        print(f"[MQTT] Received: {data}")

        if "data_source_id" not in data or "point_id" not in data or "value" not in data:
            print("[MQTT] Invalid payload, skipping.")
            return

        cnx = mysql.connector.connect(**config.myems_system_db)
        cursor = cnx.cursor()

        # Example: insert real-time reading
        add_row = ("INSERT INTO tbl_points_values (data_source_id, point_id, utc_date_time, actual_value) "
                   "VALUES (%s, %s, UTC_TIMESTAMP(), %s)")
        cursor.execute(add_row, (data['data_source_id'], data['point_id'], data['value']))
        cnx.commit()

        cursor.close()
        cnx.close()

    except Exception as e:
        print("[MQTT] Error processing message:", e)
