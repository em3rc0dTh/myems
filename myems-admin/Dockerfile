FROM nginx:latest

# Eliminar la configuración por defecto de Nginx (opcional, pero recomendable)
RUN rm /etc/nginx/conf.d/default.conf && \
    rm /etc/nginx/nginx.conf

# Crear la carpeta raíz para los archivos del frontend
RUN mkdir -p /var/www/myems-admin

# Copiar el nginx.conf de tu proyecto al contenedor
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar todo el contenido de tu frontend al contenedor
COPY . /var/www/myems-admin

# Exponer el puerto que definiste en nginx.conf
EXPOSE 8001

# Ejecutar Nginx en primer plano con tu configuración
CMD ["nginx", "-c", "/etc/nginx/nginx.conf", "-g", "daemon off;"]
