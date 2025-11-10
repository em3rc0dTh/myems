"""
Servicio MyEMS Modbus TCP Gateway - Módulo de Monitoreo del Gateway

Este módulo se encarga de monitorear el estado del gateway y reportarlo al sistema MyEMS.
Verifica periódicamente la autenticación del gateway y actualiza la marca de tiempo
de la última conexión para indicar que el gateway está activo y operativo.

El proceso de monitoreo del gateway realiza las siguientes funciones:
1. Verifica la autenticación del token del gateway con el sistema
2. Recopila información de estado del gateway (actualmente solo la marca de tiempo)
3. Actualiza en la base de datos del sistema la última fecha y hora de actividad del gateway

Esto permite al sistema MyEMS rastrear qué gateways están en línea y operativos.
"""

import time
from datetime import datetime

import mysql.connector
import schedule

import config


########################################################################################################################
# Procedimientos del trabajo del Gateway
# Paso 1: Verificar Token del Gateway - Autenticar el gateway con el sistema
# Paso 2: Recopilar Información del Gateway - Obtener datos de estado y rendimiento
# Paso 3: Actualizar Información del Gateway - Reportar el estado a la base de datos del sistema
########################################################################################################################


def job(logger):
    """
    Ejecuta la tarea de monitoreo del gateway.

    Esta función realiza la verificación de autenticación del gateway y el reporte de estado
    a la base de datos del sistema MyEMS.

    Args:
        logger: instancia del logger para registrar actividades y errores del gateway
    """
    ################################################################################################################
    # Paso 1: Verificar Token del Gateway - Autenticar el gateway con el sistema
    ################################################################################################################
    cnx_system_db = None
    cursor_system_db = None

    # Conectarse a la base de datos del sistema
    try:
        cnx_system_db = mysql.connector.connect(**config.myems_system_db)
        cursor_system_db = cnx_system_db.cursor()
    except Exception as e:
        logger.error("Error en el paso 1.1 del proceso del Gateway " + str(e))
        # Limpiar conexiones a la base de datos en caso de error
        if cursor_system_db:
            cursor_system_db.close()
        if cnx_system_db:
            cnx_system_db.close()
        return

    # TODO: Elegir un método más seguro para verificar el token del gateway
    # Verificar la autenticación del gateway usando ID y token
    try:
        query = (" SELECT name "
                 " FROM tbl_gateways "
                 " WHERE id = %s AND token = %s ")
        cursor_system_db.execute(query, (config.gateway['id'], config.gateway['token']))
        row = cursor_system_db.fetchone()
    except Exception as e:
        logger.error("Error en el paso 1.2 del proceso del Gateway: " + str(e))
        # Limpiar conexiones a la base de datos en caso de error
        if cursor_system_db:
            cursor_system_db.close()
        if cnx_system_db:
            cnx_system_db.close()
        return

    # Verificar si la autenticación del gateway fue exitosa
    if row is None:
        logger.error("Error en el paso 1.3 del proceso del Gateway: No encontrado ")
        # Limpiar conexiones a la base de datos
        if cursor_system_db:
            cursor_system_db.close()
        if cnx_system_db:
            cnx_system_db.close()
        return

    ############################################################################################################
    # Paso 2: Recopilar Información del Gateway - Obtener datos de estado y rendimiento
    ############################################################################################################
    # TODO: Obtener más información, como uso de CPU/MEMORIA/DISCO, estado de red, etc.
    # Actualmente solo se obtiene la marca de tiempo actual como información básica de estado
    current_datetime_utc = datetime.utcnow()

    ############################################################################################################
    # Paso 3: Actualizar Información del Gateway - Reportar estado a la base de datos del sistema
    ############################################################################################################
    # Actualizar la marca de tiempo de "última conexión" para indicar que el gateway está activo
    update_row = (" UPDATE tbl_gateways "
                  " SET last_seen_datetime_utc = '" + current_datetime_utc.isoformat() + "' "
                  " WHERE id = %s ")
    try:
        cursor_system_db.execute(update_row, (config.gateway['id'], ))
        cnx_system_db.commit()
    except Exception as e:
        logger.error("Error en el paso 3.1 del proceso del Gateway " + str(e))
        return
    finally:
        # Siempre cerrar las conexiones a la base de datos
        if cursor_system_db:
            cursor_system_db.close()
        if cnx_system_db:
            cnx_system_db.close()


def process(logger):
    """
    Función principal del proceso de monitoreo del gateway.

    Esta función programa y gestiona la ejecución periódica de la tarea de monitoreo del gateway.
    Se ejecuta en intervalos regulares para mantener informado al sistema
    sobre el estado operativo del gateway.

    Args:
        logger: instancia del logger para registrar actividades y errores del proceso
    """
    # Programar la tarea de monitoreo del gateway para que se ejecute en el intervalo configurado
    schedule.every(config.interval_in_seconds).seconds.do(job, logger)

    # Bucle principal para revisar y ejecutar tareas programadas
    while True:
        schedule.run_pending()
        time.sleep(60)  # Revisar cada minuto si hay tareas pendientes
