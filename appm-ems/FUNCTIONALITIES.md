# 📡 AppM EMS - Manual de Funcionalidades Técnicas

Este documento detalla todas las capacidades implementadas en el sistema de monitorización AppM EMS para la gestión de infraestructura de racks y telemetría de energía.

---

## 1. Dashboard de Inteligencia Central (`/telxius/`)
El corazón del sistema, diseñado para ofrecer una visión "de un vistazo" de la salud del datacenter.
*   **KPIs en Tiempo Real**: Eficiencia global (%), utilización de la flota y potencia total activa.
*   **Gráfica de Tendencias (Power Trend)**: Integrada con **InfluxDB** para mostrar las últimas 24 horas de consumo.
*   **Bitácora de Logs Operativos**: Registro dinámico de eventos críticos y de sistema (ej: "Node 04-A Active").
*   **Acceso Rápido a Configuración**: Botón de acceso directo al inventario y mapeo de puertos.

## 2. Monitorización de Rack de Dos Niveles
Estructura jerárquica para navegación física intuitiva:
*   **Nivel 1: Vista de Rack (`/telxius/rack/`)**: Muestra los paneles (A1, A2, B1, B2) de los cuadros de fuerza (QDF) con resúmenes de salud.
*   **Nivel 2: Detalle de Módulo (`/telxius/module/[id]/`)**: Visualización de **alta densidad de 24 puertos** en una sola pantalla sin necesidad de scroll.

## 3. Sistema de "Semáforo" (Color Coding Status)
Lógica de alertas visuales basada en umbrales reales de potencia (P = U * A):
*   🔴 **CRITICAL**: El consumo supera el límite configurado del puerto (Limit).
*   🟠 **WARNING**: El consumo supera el 80% del límite establecido.
*   🟢 **NORMAL**: Telemetría estable con consumo detectado por encima de 0.02A.
*   ⚪ **VACANT**: Puerto sin equipo conectado o consumo despreciable (< 0.02A).

## 4. Gestión de Configuración e Inventario (`/telxius/config/`)
Panel administrativo robusto para el registro de activos:
*   **Registro de QDF**: Gestión de cuadros de fuerza (Sitio, Sala, Capacidad, Feeds A/B).
*   **Hardware de Medición**: Registro de medidores **AMC16Z** mediante Número de Serie (SN).
*   **Smart Port Resolver (Mapeo)**: Herramienta interactiva para asociar puertos lógicos (**PORT_01-24**) a ranuras físicas del rack (ej: Panel A1 - Slot 12).

## 5. Integración de Datos (Data Flow)
*   **Protocolo MQTT**: Conexión nativa con el broker AppM EMS para lectura de telemetría AMC16Z en tiempo real.
*   **Persistencia InfluxDB**: Puente `/api/history` para recuperación de datos históricos, evitando la pérdida de gráficas al refrescar la sesión.
*   **Resiliencia de Carga**: El sistema maneja mensajes MQTT fragmentados y reconstruye el estado del equipo de forma incremental.

## 6. UX/UI Industrial Premium
*   **Estética Dark Mode**: Interfaz optimizada para salas de control de NOC/SOC.
*   **Micro-interacciones**: Animaciones suaves con `framer-motion` para transiciones de estado de energía.
*   **Responsive Control**: Diseño fluido que se adapta a monitores de alta resolución y tablets industriales.

---
**Nota Técnica**: El sistema respeta el aislamiento de red del `docker-compose` original, operando sobre los puertos y redes ya configuradas en el entorno MyEMS.
