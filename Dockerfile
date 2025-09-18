# --- Etapa de Build ---
# Usamos una imagen de Node.js para instalar dependencias y construir el proyecto
FROM node:20 AS builder

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de manifiesto del proyecto
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos todo el código fuente del proyecto
COPY . .

# Construimos la aplicación de TypeScript a JavaScript
RUN npm run build

# --- Etapa de Producción ---
# Usamos una imagen más ligera para la ejecución
FROM node:20-alpine

WORKDIR /app

# Copiamos las dependencias de producción desde la etapa de 'builder'
COPY --from=builder /app/node_modules ./node_modules
# Copiamos el código ya compilado desde la etapa de 'builder'
COPY --from=builder /app/dist ./dist

# Exponemos el puerto 3000
EXPOSE 3000

# El comando para iniciar la aplicación
CMD ["node", "dist/main"]