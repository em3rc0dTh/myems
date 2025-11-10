"""
Servicio MyEMS Modbus TCP Gateway - Módulo Principal

Este módulo es el punto de entrada principal para el servicio de gateway MyEMS Modbus TCP.
Inicializa el registro de logs, inicia el proceso de monitoreo del gateway y gestiona
los procesos de adquisición de fuentes de datos para la comunicación Modbus TCP.

El servicio realiza las siguientes funciones:
1. Configura el registro de logs y el manejo de errores
2. Inicia el proceso de monitoreo del gateway para reportar el estado del gateway
3. Descubre y valida las fuentes de datos Modbus TCP desde la base de datos del sistema
4. Crea procesos de adquisición separados para cada fuente de datos
5. Gestiona el ciclo de vida de los procesos y la recuperación de errores

Cada fuente de datos representa un servidor Modbus TCP (dispositivo esclavo) al cual el gateway
se conectará y del que leerá datos en intervalos regulares.
"""

import json
import logging
import time
from logging.handlers import RotatingFileHandler
from multiprocessing import Process
import mysql.connector
import acquisition
import config
import gateway


def main():
    """
    Función principal para inicializar el servicio MyEMS Modbus TCP Gateway.

    Configura el registro de logs, inicia el proceso de monitoreo del gateway, descubre las fuentes de datos
    y lanza procesos de adquisición para cada fuente de datos Modbus TCP.
    """
    # Crear el logger para el servicio Modbus TCP Gateway
    logger = logging.getLogger('myems-modbus-tcp')

    # Establecer el nivel de logging en ERROR para capturar solo mensajes de error y superiores
    # Esto especifica el nivel mínimo de severidad que manejará el logger,
    # donde DEBUG es el nivel más bajo y CRITICAL el más alto.
    # Por ejemplo, si el nivel de severidad es INFO, el logger manejará solo INFO, WARNING, ERROR y CRITICAL,
    # ignorando los mensajes DEBUG.
    logger.setLevel(logging.ERROR)

    # Crear un manejador de archivo rotativo que registra mensajes en un archivo
    # maxBytes=1024*1024 significa 1MB, backupCount=1 indica mantener 1 archivo de respaldo
    fh = RotatingFileHandler('myems-modbus-tcp.log', maxBytes=1024*1024, backupCount=1)

    # Crear un formateador para los mensajes de log y añadirlo al manejador de archivos
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)

    # Agregar el manejador de archivo al logger
    logger.addHandler(fh)

    # Agregar un manejador de consola para enviar la salida de logs a sys.stderr
    logger.addHandler(logging.StreamHandler())

    ####################################################################################################################
    # Crear Proceso del Gateway - Monitorear el estado del gateway y reportarlo al sistema
    ####################################################################################################################
    Process(target=gateway.process, args=(logger,)).start()

    # Obtener las fuentes de datos desde la base de datos del sistema
    data_source_list = list()
    while True:
        # TODO: Este servicio debe REINICIARSE para recargar las últimas fuentes de datos, esto debe corregirse
        # Conectarse a la base de datos del sistema para descubrir las fuentes de datos disponibles
        cnx_system_db = None
        cursor_system_db = None
        try:
            cnx_system_db = mysql.connector.connect(**config.myems_system_db)
            cursor_system_db = cnx_system_db.cursor()
        except Exception as e:
            logger.error("Error en el proceso principal " + str(e))
            # Cerrar conexiones de base de datos en caso de error
            if cursor_system_db:
                cursor_system_db.close()
            if cnx_system_db:
                cnx_system_db.close()
            # Dormir varios minutos y continuar el bucle externo para recargar los puntos
            time.sleep(60)
            continue

        # Obtener fuentes de datos por gateway y protocolo
        rows_data_source = None
        try:
            # Consultar todas las fuentes de datos Modbus TCP asociadas a este gateway
            query = (" SELECT ds.id, ds.name, ds.connection "
                     " FROM tbl_data_sources ds, tbl_gateways g "
                     " WHERE ds.protocol = 'modbus-tcp' AND ds.gateway_id = g.id AND g.id = %s AND g.token = %s "
                     " ORDER BY ds.id ")
            cursor_system_db.execute(query, (config.gateway['id'], config.gateway['token'],))
            rows_data_source = cursor_system_db.fetchall()

            # Restablecer process_id de las fuentes de datos a NULL para limpiar referencias antiguas
            query = (" UPDATE tbl_data_sources ds, tbl_gateways g "
                     " SET ds.process_id = NULL "
                     " WHERE ds.protocol = 'modbus-tcp' AND ds.gateway_id = g.id AND g.id = %s AND g.token = %s ")
            cursor_system_db.execute(query, (config.gateway['id'], config.gateway['token'],))
            cnx_system_db.commit()

        except Exception as e:
            logger.error("Error en el proceso principal " + str(e))
            # Dormir varios minutos y continuar el bucle externo para recargar los puntos
            time.sleep(60)
        finally:
            # Siempre cerrar las conexiones de base de datos
            if cursor_system_db:
                cursor_system_db.close()
            if cnx_system_db:
                cnx_system_db.close()

        # Verificar si se encontraron fuentes de datos
        if rows_data_source is None or len(rows_data_source) == 0:
            logger.error("No se encontró ninguna fuente de datos. Esperando unos minutos para reintentar.")
            # Esperar un tiempo antes de volver a intentar
            time.sleep(60)
            continue
        else:
            # Detener el bucle while para conectar estas fuentes de datos
            data_source_list = rows_data_source
            break

    # Procesar cada fuente de datos descubierta
    for data_source in data_source_list:
        print("Fuente de Datos: ID=%s, Nombre=%s, Conexión=%s " %
              (data_source[0], data_source[1], data_source[2]))

        # Validar la configuración de conexión de la fuente de datos
        if data_source[2] is None or len(data_source[2]) == 0:
            logger.error("Conexión de la fuente de datos no encontrada.")
            continue

        # Analizar la configuración JSON de la conexión
        try:
            server = json.loads(data_source[2])
        except Exception as e:
            logger.error("Error en el JSON de la conexión de la fuente de datos " + str(e))
            continue

        # Validar los parámetros requeridos de la conexión
        if 'host' not in server.keys() \
                or 'port' not in server.keys() \
                or server['host'] is None \
                or server['port'] is None \
                or len(server['host']) == 0 \
                or not isinstance(server['port'], int) \
                or server['port'] < 1 \
                or server['port'] > 65535:
            logger.error("Conexión de la fuente de datos inválida.")
            continue

        # Validar o establecer el intervalo por defecto para la adquisición de datos
        if 'interval_in_seconds' not in server.keys() \
            or (not isinstance(server['interval_in_seconds'], int)
                and not isinstance(server['interval_in_seconds'], float)) \
            or server['interval_in_seconds'] < 0 \
                or server['interval_in_seconds'] > 3600:
            # Usar el intervalo por defecto de la configuración
            interval_in_seconds = config.interval_in_seconds
        else:
            # Usar el intervalo configurado en la fuente de datos
            interval_in_seconds = server['interval_in_seconds']

        # Crear un proceso de trabajo para cada fuente de datos
        # TODO: Cómo reiniciar el proceso si termina inesperadamente
        Process(target=acquisition.process,
                args=(logger, data_source[0], server['host'], server['port'], interval_in_seconds)).start()


if __name__ == "__main__":
    main()
