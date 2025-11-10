"""
MyEMS Modbus TCP Gateway Service - Módulo de Configuración

Este módulo contiene todos los ajustes de configuración para el servicio de pasarela
(Modbus TCP Gateway) de MyEMS.  
Utiliza la librería python-decouple para leer configuraciones desde variables de entorno,
con valores predeterminados adecuados para el desarrollo local.

La configuración incluye:
- Parámetros de conexión a las bases de datos (sistema e histórica)
- Intervalos de adquisición de datos
- Identificación y autenticación del gateway
"""

from decouple import config
MYEMS_HOST = config("MYEMS_HOST", default="127.0.0.1")
MYEMS_PORT = config("MYEMS_PORT", default=3306, cast=int)
MYEMS_USER = config("MYEMS_USER", default="root")
MYEMS_PASSWORD = config("MYEMS_PASSWORD", default="!MyEMS1")


# Configuración de conexión a la base de datos del sistema MyEMS
# Esta base de datos contiene la configuración del sistema, definiciones de fuentes de datos
# y la información del gateway.
myems_system_db = {
    'host': config('MYEMS_SYSTEM_DB_HOST', default=MYEMS_HOST),
    'port': config('MYEMS_SYSTEM_DB_PORT', default=MYEMS_PORT, cast=int),
    'database': config('MYEMS_SYSTEM_DB_DATABASE', default='myems_system_db'),
    'user': config('MYEMS_SYSTEM_DB_USER', default=MYEMS_USER),
    'password': config('MYEMS_SYSTEM_DB_PASSWORD', default=MYEMS_PASSWORD),
}

# Configuración de conexión a la base de datos histórica de MyEMS
# Esta base de datos almacena los datos de series temporales recolectados
# desde los dispositivos Modbus TCP.
myems_historical_db = {
    'host': config('MYEMS_HISTORICAL_DB_HOST', default=MYEMS_HOST),
    'port': config('MYEMS_HISTORICAL_DB_PORT', default=MYEMS_PORT, cast=int),
    'database': config('MYEMS_HISTORICAL_DB_DATABASE', default='myems_historical_db'),
    'user': config('MYEMS_HISTORICAL_DB_USER', default=MYEMS_USER),
    'password': config('MYEMS_HISTORICAL_DB_PASSWORD', default=MYEMS_PASSWORD),
}


# Intervalo de adquisición de datos: indica cuánto tiempo espera el proceso entre lecturas
# Este es el intervalo por defecto cuando las fuentes de datos no especifican uno propio.
# Por defecto son 600 segundos (10 minutos) entre ciclos de recolección de datos.
interval_in_seconds = config('INTERVAL_IN_SECONDS', default=600, cast=int)

# Configuración de identificación y autenticación del gateway
# Se utilizan para identificar esta instancia del gateway y autenticarla en el sistema MyEMS.
# El ID y el token del gateway se obtienen desde MyEMS Admin y sirven para:
# 1. Asociar las fuentes de datos con este gateway
# 2. Autenticar el reporte de estado del gateway
# 3. Autorizar el acceso a las fuentes de datos
gateway = {
    'id': config('GATEWAY_ID', default=1, cast=int),
    'token': config('GATEWAY_TOKEN', default='983427af-1c35-42ba-8b4d-288675550225')
}
