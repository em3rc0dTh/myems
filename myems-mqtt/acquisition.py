import json
import mysql.connector
import config


def handle_message(topic, payload):
    """Process incoming MQTT message."""
    try:
        data = json.loads(payload.decode("utf-8"))

        # Flexibility: support both MyEMS standard and some simulator/test formats
        data_source_id = data.get("data_source_id") or data.get("device_id")
        point_id = data.get("point_id")
        value = data.get("value")

        if data_source_id is None or point_id is None or value is None:
            print(
                f"[MQTT] Skipping {topic}: Missing required fields (data_source_id/device_id, point_id, value). Payload: {data}"
            )
            return

        print(
            f"[MQTT] Processing: topic={topic}, data_source={data_source_id}, point={point_id}, value={value}"
        )

        cnx = mysql.connector.connect(**config.myems_system_db)
        cursor = cnx.cursor()

        # Insert real-time reading
        add_row = (
            "INSERT INTO tbl_points_values (data_source_id, point_id, utc_date_time, actual_value) "
            "VALUES (%s, %s, UTC_TIMESTAMP(), %s)"
        )
        cursor.execute(add_row, (data_source_id, point_id, value))
        cnx.commit()

        cursor.close()
        cnx.close()

    except Exception as e:
        print(f"[MQTT] Error processing message on {topic}: {e}")
