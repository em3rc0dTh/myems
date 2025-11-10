"""
MyEMS Modbus TCP Gateway Service - Módulo de Adquisición de Datos

Este módulo maneja la funcionalidad principal de adquisición de datos para dispositivos Modbus TCP.
Se conecta a servidores Modbus TCP (dispositivos esclavos), lee datos de puntos configurados
y almacena la información recopilada en la base de datos histórica de MyEMS.

El proceso de adquisición realiza las siguientes funciones:
1. Actualiza el ID del proceso en la base de datos para su monitoreo.
2. Verifica la conectividad con el host y puerto Modbus TCP.
3. Recupera la configuración de puntos desde la base de datos del sistema.
4. Lee los valores de los puntos desde los esclavos Modbus TCP usando los parámetros configurados.
5. Procesa y valida los datos recopilados.
6. Inserta en bloque los valores de los puntos y actualiza los valores más recientes en la base de datos histórica.

El módulo soporta múltiples tipos de datos:
- ANALOG_VALUE: Lecturas continuas de sensores (temperatura, presión, flujo, etc.)
- DIGITAL_VALUE: Estados binarios (encendido/apagado, abierto/cerrado, estado de alarma, etc.)
- ENERGY_VALUE: Datos acumulativos de consumo energético (lecturas de kWh)

El procesamiento de datos incluye:
- Cálculos de razón y desplazamiento para calibración
- Intercambio de bytes para dispositivos con orden de bytes no estándar
- Validación de datos y verificación de rangos
- Almacenamiento de datos de tendencia y actualización de valores más recientes
"""

import os
import json
import math
import telnetlib3
import asyncio
import time
from datetime import datetime
from decimal import Decimal
import mysql.connector
from modbus_tk import modbus_tcp
import config
from byte_swap import byte_swap_32_bit, byte_swap_64_bit


########################################################################################################################
# Verificar la conectividad con el host y el puerto
########################################################################################################################
async def check_connectivity(host, port):
    """
    Prueba la conectividad TCP básica con un host y puerto Modbus TCP.

    Esta función intenta establecer una conexión TCP para verificar que
    el servidor Modbus TCP de destino sea accesible antes de iniciar la comunicación Modbus.

    Args:
        host: Nombre del host o dirección IP del servidor Modbus TCP
        port: Número de puerto de destino (típicamente 502 para Modbus TCP)

    Raises:
        Exception: Si la conexión falla
    """
    reader, writer = await telnetlib3.open_connection(host, port)
    # Cierra la conexión inmediatamente después de establecerla
    writer.close()


########################################################################################################################
# Procedimientos de Adquisición de Datos
# Paso 1: Actualizar el ID del proceso en la base de datos para monitoreo y gestión
# Paso 2: Verificar la conectividad con el host y puerto Modbus TCP
# Paso 3: Obtener la lista de puntos desde la base de datos del sistema para esta fuente de datos
# Paso 4: Leer los valores de los puntos desde los esclavos Modbus TCP usando los parámetros configurados
# Paso 5: Insertar en bloque los valores y actualizar los valores más recientes en la base de datos histórica
########################################################################################################################

def process(logger, data_source_id, host, port, interval_in_seconds):
    """
    Función principal del proceso de adquisición de datos.

    Esta función gestiona el ciclo completo de adquisición de datos para una fuente Modbus TCP.
    Se ejecuta de forma continua, conectándose al dispositivo Modbus, leyendo los puntos configurados
    y almacenando los datos en la base de datos histórica.

    Args:
        logger: Instancia del registrador para registrar actividades y errores de adquisición
        data_source_id: Identificador único de la fuente de datos en la base de datos del sistema
        host: Nombre del host o dirección IP del servidor Modbus TCP
        port: Número de puerto del servidor Modbus TCP (típicamente 502)
        interval_in_seconds: Intervalo de tiempo entre ciclos de adquisición de datos
    """
    ####################################################################################################################
    # Paso 1: Actualizar el ID del proceso en la base de datos para monitoreo y gestión
    ####################################################################################################################
    cnx_system_db = None
    cursor_system_db = None

    # Conectarse a la base de datos del sistema para registrar este proceso de adquisición
    try:
        cnx_system_db = mysql.connector.connect(**config.myems_system_db)
        cursor_system_db = cnx_system_db.cursor()
    except Exception as e:
        logger.error("Error en el paso 1.1 del proceso de adquisición " + str(e))
        # Cierra las conexiones de base de datos en caso de error
        if cursor_system_db:
            cursor_system_db.close()
        if cnx_system_db:
            cnx_system_db.close()
        return

    # Actualiza el registro de la fuente de datos con el ID de proceso actual para monitoreo
    update_row = (" UPDATE tbl_data_sources "
                  " SET process_id = %s "
                  " WHERE id = %s ")
    try:
        cursor_system_db.execute(update_row, (os.getpid(), data_source_id,))
        cnx_system_db.commit()
    except Exception as e:
        logger.error("Error en el paso 1.2 del proceso de adquisición " + str(e))
        return
    finally:
        # Siempre cerrar las conexiones de base de datos
        if cursor_system_db:
            cursor_system_db.close()
        if cnx_system_db:
            cnx_system_db.close()

    # Bucle principal de adquisición: se ejecuta continuamente hasta la terminación del proceso
    while True:
        # Inicio del bucle externo principal
        ################################################################################################################
        # Paso 2: Verificar la conectividad con el host y puerto Modbus TCP
        ################################################################################################################
        try:
            # Prueba de conectividad TCP básica antes de intentar la comunicación Modbus
            asyncio.run(check_connectivity(host, port))
            print("Conexión exitosa con %s:%s en el proceso de adquisición ", host, port)
        except Exception as e:
            logger.error("Fallo al conectar con %s:%s en el proceso de adquisición: %s  ", host, port, str(e))
            # Reinicia el bucle principal y espera antes de reintentar
            time.sleep(300)  # Espera 5 minutos antes de reintentar la conexión
            continue

        ################################################################################################################
        # Paso 3: Obtener la lista de puntos desde la base de datos del sistema para esta fuente de datos
        ################################################################################################################
        cnx_system_db = None
        cursor_system_db = None

        # Conectarse a la base de datos del sistema para recuperar la configuración de los puntos
        try:
            cnx_system_db = mysql.connector.connect(**config.myems_system_db)
            cursor_system_db = cnx_system_db.cursor()
        except Exception as e:
            logger.error("Error en el paso 3.1 del proceso de adquisición " + str(e))
            # Cierra las conexiones de base de datos en caso de error
            if cursor_system_db:
                cursor_system_db.close()
            if cnx_system_db:
                cnx_system_db.close()
            # Regresar al inicio del bucle principal
            time.sleep(60)
            continue
        # Recuperar todos los puntos configurados para esta fuente de datos
        try:
            query = (" SELECT id, name, object_type, is_trend, ratio, offset_constant, address "
                     " FROM tbl_points "
                     " WHERE data_source_id = %s AND is_virtual = 0 "
                     " ORDER BY id ")
            cursor_system_db.execute(query, (data_source_id,))
            rows_point = cursor_system_db.fetchall()
        except Exception as e:
            logger.error("Error en el paso 3.2 del proceso de adquisición: " + str(e))
            # Limpiar las conexiones de base de datos en caso de error
            if cursor_system_db:
                cursor_system_db.close()
            if cnx_system_db:
                cnx_system_db.close()
            # Regresar al inicio del bucle principal
            time.sleep(60)
            continue

        # Validar que se encontraron puntos para esta fuente de datos
        if rows_point is None or len(rows_point) == 0:
            # No hay puntos configurados para esta fuente de datos
            logger.error("No se encontraron puntos en la fuente de datos (ID = %s), proceso de adquisición terminado ", data_source_id)
            # Cerrar conexiones de base de datos
            if cursor_system_db:
                cursor_system_db.close()
            if cnx_system_db:
                cnx_system_db.close()
            # Regresar al inicio del bucle principal
            time.sleep(60)
            continue

        # Construir la lista de puntos a partir de los resultados de la base de datos
        # Hay puntos configurados para esta fuente de datos
        point_list = list()
        for row_point in rows_point:
            point_list.append({"id": row_point[0],
                               "name": row_point[1],
                               "object_type": row_point[2],
                               "is_trend": row_point[3],
                               "ratio": row_point[4],
                               "offset_constant": row_point[5],
                               "address": row_point[6]})

        ################################################################################################################
        # Paso 4: Leer los valores de los puntos desde los esclavos Modbus TCP usando los parámetros configurados
        ################################################################################################################
        # Conectar a la base de datos histórica para almacenar los datos recopilados
        cnx_historical_db = None
        cursor_historical_db = None
        try:
            cnx_historical_db = mysql.connector.connect(**config.myems_historical_db)
            cursor_historical_db = cnx_historical_db.cursor()
        except Exception as e:
            logger.error("Error en el paso 4.1 del proceso de adquisición " + str(e))
            # Limpiar conexiones de base de datos en caso de error
            if cursor_historical_db:
                cursor_historical_db.close()
            if cnx_historical_db:
                cnx_historical_db.close()

            if cursor_system_db:
                cursor_system_db.close()
            if cnx_system_db:
                cnx_system_db.close()
            # Regresar al inicio del bucle principal
            time.sleep(60)
            continue

        # Conectarse a la fuente de datos Modbus TCP (dispositivo esclavo)
        master = modbus_tcp.TcpMaster(host=host, port=port, timeout_in_sec=5.0)
        master.set_timeout(5.0)
        print("Listo para conectar a %s:%s ", host, port)

        # Bucle interno para leer los valores de todos los puntos de forma periódica
        while True:
            # Inicio del bucle interno
            is_modbus_tcp_timed_out = False
            energy_value_list = list()
            analog_value_list = list()
            digital_value_list = list()

            # TODO: Actualizar la lista de puntos en otro hilo para permitir cambios dinámicos de configuración
            # Procesar cada punto configurado
            for point in point_list:
                # Inicio del bucle foreach para cada punto
                try:
                    # Analizar la configuración de dirección del punto desde JSON
                    address = json.loads(point['address'])
                except Exception as e:
                    logger.error("Error en el paso 4.2 del proceso de adquisición: dirección del punto inválida en JSON " + str(e))
                    continue

                # Validar la configuración de dirección del punto
                if 'slave_id' not in address.keys() \
                        or 'function_code' not in address.keys() \
                        or 'offset' not in address.keys() \
                        or 'number_of_registers' not in address.keys() \
                        or 'format' not in address.keys() \
                        or 'byte_swap' not in address.keys() \
                        or address['slave_id'] < 1 \
                        or address['function_code'] not in (1, 2, 3, 4) \
                        or address['offset'] < 0 \
                        or address['number_of_registers'] < 0 \
                        or len(address['format']) < 1 \
                        or not isinstance(address['byte_swap'], bool):
                    logger.error('Fuente de datos (ID=%s), Punto (ID=%s) contiene datos de dirección inválidos.',
                                 data_source_id, point['id'])
                    # Configuración del punto inválida detectada
                    # Ir al inicio del bucle foreach para procesar el siguiente punto
                    continue

                # Leer el valor del punto desde el esclavo Modbus TCP
                try:
                    result = master.execute(slave=address['slave_id'],
                                            function_code=address['function_code'],
                                            starting_address=address['offset'],
                                            quantity_of_x=address['number_of_registers'],
                                            data_format=address['format'])
                except Exception as e:
                    logger.error(str(e) +
                                 " host:" + host + " port:" + str(port) +
                                 " slave_id:" + str(address['slave_id']) +
                                 " function_code:" + str(address['function_code']) +
                                 " starting_address:" + str(address['offset']) +
                                 " quantity_of_x:" + str(address['number_of_registers']) +
                                 " data_format:" + str(address['format']) +
                                 " byte_swap:" + str(address['byte_swap']))

                    if 'timed out' in str(e):
                        is_modbus_tcp_timed_out = True
                        # Error por tiempo de espera — salir del bucle foreach de puntos
                        break
                    else:
                        # Excepción al leer el valor del registro
                        # Ir al inicio del bucle foreach para procesar el siguiente punto
                        continue

                # Validar el resultado leído
                if result is None or not isinstance(result, tuple) or len(result) == 0:
                    logger.error("Error en el paso 4.3 del proceso de adquisición: \n"
                                 " resultado inválido: None "
                                 " para point_id: " + str(point['id']))
                    # Resultado inválido
                    # Ir al inicio del bucle foreach para procesar el siguiente punto
                    continue

                # Validar el valor del resultado
                if not isinstance(result[0], float) and not isinstance(result[0], int) or math.isnan(result[0]):
                    logger.error(" Error en el paso 4.4 del proceso de adquisición:\n"
                                " resultado inválido: no es float ni int o no es un número "
                                " para point_id: " + str(point['id']))
                    # Resultado inválido
                    # Volver al inicio del bucle foreach para procesar el siguiente punto
                    continue

                # Aplicar intercambio de bytes si está configurado
                if address['byte_swap']:
                    if address['number_of_registers'] == 2:
                        # Datos de 32 bits (2 registros): intercambiar bytes adyacentes
                        value = byte_swap_32_bit(result[0])
                    elif address['number_of_registers'] == 4:
                        # Datos de 64 bits (4 registros): intercambiar bytes adyacentes
                        value = byte_swap_64_bit(result[0])
                    else:
                        # No se realiza intercambio de bytes para otras cantidades de registros
                        value = result[0]
                else:
                    # No se requiere intercambio de bytes
                    value = result[0]

                # Procesar el valor según el tipo de punto y aplicar razón/desplazamiento
                if point['object_type'] == 'ANALOG_VALUE':
                    # SQL estándar requiere que DECIMAL(18,3) pueda almacenar cualquier valor con 18 dígitos y
                    # 3 decimales, por lo que los valores almacenables están en el rango
                    # de -999999999999999.999 a 999999999999999.999.
                    if Decimal(-999999999999999.999) <= Decimal(value) <= Decimal(999999999999999.999):
                        analog_value_list.append({'point_id': point['id'],
                                                'is_trend': point['is_trend'],
                                                'value': Decimal(value) * point['ratio'] + point['offset_constant']})
                elif point['object_type'] == 'ENERGY_VALUE':
                    # SQL estándar requiere que DECIMAL(18,3) pueda almacenar cualquier valor con 18 dígitos y
                    # 3 decimales, por lo que los valores almacenables están en el rango
                    # de -999999999999999.999 a 999999999999999.999.
                    if Decimal(-999999999999999.999) <= Decimal(value) <= Decimal(999999999999999.999):
                        energy_value_list.append({'point_id': point['id'],
                                                'is_trend': point['is_trend'],
                                                'value': Decimal(value) * point['ratio'] + point['offset_constant']})
                elif point['object_type'] == 'DIGITAL_VALUE':
                    digital_value_list.append({'point_id': point['id'],
                                            'is_trend': point['is_trend'],
                                            'value': int(value) * int(point['ratio']) + int(point['offset_constant'])
                                            })

                # Fin del bucle foreach de puntos

                if is_modbus_tcp_timed_out:
                    # Se produjo un tiempo de espera (timeout) en la conexión Modbus TCP
                    # Limpiar las conexiones y reiniciar el proceso de adquisición

                    # Destruir la conexión del maestro Modbus
                    del master

                    # Cerrar todas las conexiones a bases de datos
                    if cursor_historical_db:
                        cursor_historical_db.close()
                    if cnx_historical_db:
                        cnx_historical_db.close()
                    if cursor_system_db:
                        cursor_system_db.close()
                    if cnx_system_db:
                        cnx_system_db.close()

                    # Romper el bucle interno y volver al inicio del bucle más externo
                    time.sleep(60)
                    break

                ############################################################################################################
                # Paso 5: Inserción masiva de valores de puntos y actualización de valores más recientes en la base de datos histórica
                ############################################################################################################
                # Verificar la conexión con la base de datos histórica
                if not cnx_historical_db.is_connected():
                    try:
                        cnx_historical_db = mysql.connector.connect(**config.myems_historical_db)
                        cursor_historical_db = cnx_historical_db.cursor()
                    except Exception as e:
                        logger.error("Error en el paso 5.1 del proceso de adquisición: " + str(e))
                        # Limpiar conexiones de base de datos en caso de error
                        if cursor_historical_db:
                            cursor_historical_db.close()
                        if cnx_historical_db:
                            cnx_historical_db.close()
                        # Volver al inicio del bucle interno
                        time.sleep(60)
                        continue

                # Verificar la conexión con la base de datos del sistema
                if not cnx_system_db.is_connected():
                    try:
                        cnx_system_db = mysql.connector.connect(**config.myems_system_db)
                        cursor_system_db = cnx_system_db.cursor()
                    except Exception as e:
                        logger.error("Error en el paso 5.2 del proceso de adquisición: " + str(e))
                        # Limpiar conexiones de base de datos en caso de error
                        if cursor_system_db:
                            cursor_system_db.close()
                        if cnx_system_db:
                            cnx_system_db.close()
                        # Volver al inicio del bucle interno
                        time.sleep(60)
                        continue

            # Obtener la marca de tiempo UTC actual para almacenar los datos
            current_datetime_utc = datetime.utcnow()

            # Inserción masiva de valores analógicos en la base de datos histórica y actualización de los valores más recientes
            # Procesar en lotes de 100 para evitar sobrecargar la base de datos
            while len(analog_value_list) > 0:
                analog_value_list_100 = analog_value_list[:100]  # Tomar los primeros 100 elementos
                analog_value_list = analog_value_list[100:]      # Eliminar los elementos ya procesados

                # Construir la sentencia INSERT para los datos de tendencia (valores históricos)
                add_values = (" INSERT INTO tbl_analog_value (point_id, utc_date_time, actual_value) "
                            " VALUES  ")
                trend_value_count = 0

                # Agregar los valores de tendencia a la sentencia INSERT
                for point_value in analog_value_list_100:
                    if point_value['is_trend']:
                        add_values += " (" + str(point_value['point_id']) + ","
                        add_values += "'" + current_datetime_utc.isoformat() + "',"
                        add_values += str(point_value['value']) + "), "
                        trend_value_count += 1

                # Ejecutar la inserción de datos de tendencia si existen valores de tendencia
                if trend_value_count > 0:
                    try:
                        # Quitar la coma final “, ” de la cadena y luego ejecutar
                        cursor_historical_db.execute(add_values[:-2])
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.3.1 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

                # Actualizar la tabla de últimos valores para valores analógicos
                delete_values = " DELETE FROM tbl_analog_value_latest WHERE point_id IN ( "
                latest_values = (" INSERT INTO tbl_analog_value_latest (point_id, utc_date_time, actual_value) "
                                " VALUES  ")
                latest_value_count = 0

                # Construir las sentencias DELETE e INSERT para los valores más recientes
                for point_value in analog_value_list_100:
                    delete_values += str(point_value['point_id']) + ","
                    latest_values += " (" + str(point_value['point_id']) + ","
                    latest_values += "'" + current_datetime_utc.isoformat() + "',"
                    latest_values += str(point_value['value']) + "), "
                    latest_value_count += 1

                # Ejecutar la actualización de valores recientes si hay datos a procesar
                if latest_value_count > 0:
                    try:
                        # Reemplazar la coma final por “)” y ejecutar DELETE
                        cursor_historical_db.execute(delete_values[:-1] + ")")
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.3.2 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

                    try:
                        # Quitar la coma final “, ” de la cadena y luego ejecutar INSERT
                        cursor_historical_db.execute(latest_values[:-2])
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.3.3 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

            # Inserción masiva de valores de energía en la base de datos histórica y actualización de los valores más recientes
            # Procesar en lotes de 100 para evitar sobrecargar la base de datos
            while len(energy_value_list) > 0:
                energy_value_list_100 = energy_value_list[:100]  # Tomar los primeros 100 elementos
                energy_value_list = energy_value_list[100:]      # Eliminar los elementos ya procesados

                # Construir la sentencia INSERT para los datos de tendencia (valores históricos)
                add_values = (" INSERT INTO tbl_energy_value (point_id, utc_date_time, actual_value) "
                            " VALUES  ")
                trend_value_count = 0

                # Agregar los valores de tendencia a la sentencia INSERT
                for point_value in energy_value_list_100:
                    if point_value['is_trend']:
                        add_values += " (" + str(point_value['point_id']) + ","
                        add_values += "'" + current_datetime_utc.isoformat() + "',"
                        add_values += str(point_value['value']) + "), "
                        trend_value_count += 1

                # Ejecutar la inserción de datos de tendencia si existen valores de tendencia
                if trend_value_count > 0:
                    try:
                        # Quitar la coma final “, ” de la cadena y luego ejecutar
                        cursor_historical_db.execute(add_values[:-2])
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.4.1 del proceso de adquisición: " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

                # Actualizar la tabla de últimos valores para valores de energía
                delete_values = " DELETE FROM tbl_energy_value_latest WHERE point_id IN ( "
                latest_values = (" INSERT INTO tbl_energy_value_latest (point_id, utc_date_time, actual_value) "
                                " VALUES  ")
                latest_value_count = 0

                # Construir las sentencias DELETE e INSERT para los valores más recientes
                for point_value in energy_value_list_100:
                    delete_values += str(point_value['point_id']) + ","
                    latest_values += " (" + str(point_value['point_id']) + ","
                    latest_values += "'" + current_datetime_utc.isoformat() + "',"
                    latest_values += str(point_value['value']) + "), "
                    latest_value_count += 1

                # Ejecutar la actualización de valores recientes si hay datos a procesar
                if latest_value_count > 0:
                    try:
                        # Reemplazar la coma final por “)” y ejecutar DELETE
                        cursor_historical_db.execute(delete_values[:-1] + ")")
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.4.2 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

                    try:
                        # Quitar la coma final “, ” de la cadena y luego ejecutar INSERT
                        cursor_historical_db.execute(latest_values[:-2])
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.4.3 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento


            # Inserción masiva de valores digitales en la base de datos histórica y actualización de los valores más recientes
            # Procesar en lotes de 100 para evitar sobrecargar la base de datos
            while len(digital_value_list) > 0:
                digital_value_list_100 = digital_value_list[:100]  # Tomar los primeros 100 elementos
                digital_value_list = digital_value_list[100:]      # Eliminar los elementos ya procesados

                # Construir la sentencia INSERT para los datos de tendencia (valores históricos)
                add_values = (" INSERT INTO tbl_digital_value (point_id, utc_date_time, actual_value) "
                            " VALUES  ")
                trend_value_count = 0

                # Agregar los valores de tendencia a la sentencia INSERT
                for point_value in digital_value_list_100:
                    if point_value['is_trend']:
                        add_values += " (" + str(point_value['point_id']) + ","
                        add_values += "'" + current_datetime_utc.isoformat() + "',"
                        add_values += str(point_value['value']) + "), "
                        trend_value_count += 1

                # Ejecutar la inserción de datos de tendencia si existen valores de tendencia
                if trend_value_count > 0:
                    try:
                        # Quitar la coma final “, ” de la cadena y luego ejecutar
                        cursor_historical_db.execute(add_values[:-2])
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.5.1 del proceso de adquisición: " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

                # Actualizar la tabla de últimos valores para valores digitales
                delete_values = " DELETE FROM tbl_digital_value_latest WHERE point_id IN ( "
                latest_values = (" INSERT INTO tbl_digital_value_latest (point_id, utc_date_time, actual_value) "
                                " VALUES  ")
                latest_value_count = 0

                # Construir las sentencias DELETE e INSERT para los valores más recientes
                for point_value in digital_value_list_100:
                    delete_values += str(point_value['point_id']) + ","
                    latest_values += " (" + str(point_value['point_id']) + ","
                    latest_values += "'" + current_datetime_utc.isoformat() + "',"
                    latest_values += str(point_value['value']) + "), "
                    latest_value_count += 1

                # Ejecutar la actualización de valores recientes si hay datos a procesar
                if latest_value_count > 0:
                    try:
                        # Reemplazar la coma final por “)” y ejecutar DELETE
                        cursor_historical_db.execute(delete_values[:-1] + ")")
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.5.2 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

                    try:
                        # Quitar la coma final “, ” de la cadena y luego ejecutar INSERT
                        cursor_historical_db.execute(latest_values[:-2])
                        cnx_historical_db.commit()
                    except Exception as e:
                        logger.error("Error en el paso 5.5.3 del proceso de adquisición " + str(e))
                        # Ignorar esta excepción y continuar el procesamiento

            # Actualizar la fecha y hora de última conexión del origen de datos para indicar una recopilación exitosa
            update_row = (" UPDATE tbl_data_sources "
                        " SET last_seen_datetime_utc = '" + current_datetime_utc.isoformat() + "' "
                        " WHERE id = %s ")
            try:
                cursor_system_db.execute(update_row, (data_source_id,))
                cnx_system_db.commit()
            except Exception as e:
                logger.error("Error en el paso 5.6 del proceso de adquisición " + str(e))
                # Cerrar las conexiones a la base de datos en caso de error
                if cursor_system_db:
                    cursor_system_db.close()
                if cnx_system_db:
                    cnx_system_db.close()
                # Volver al inicio del ciclo interno
                time.sleep(60)
                continue

            # Esperar el intervalo configurado antes de iniciar el siguiente ciclo de recopilación de datos
            # Este argumento puede ser un número flotante para permitir precisión en subsegundos
            time.sleep(interval_in_seconds)

            # Fin del ciclo interno (inner while loop)

            # Fin del ciclo externo principal (outermost while loop)
