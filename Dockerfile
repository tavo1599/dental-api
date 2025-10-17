# --- ETAPA 1: CONSTRUCCIÓN (Builder) ---
# Usamos una imagen de Node.js 20 (basada en Debian)
FROM node:20 AS builder
WORKDIR /app

# 1. Instalamos las librerías del sistema operativo que Puppeteer necesita
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    --no-install-recommends

# Copiamos los archivos de dependencias
COPY package*.json ./

# 2. Instalamos las dependencias de npm
RUN npm install

# 3. Forzamos la descarga de Chromium en la carpeta .cache
#    (Render sabe dónde está gracias a la variable de entorno que pusimos)
RUN npx puppeteer browsers install chrome

# Copiamos el resto del código
COPY . .

# 4. Construimos la aplicación (compilamos de TS a JS)
RUN npm run build

# 5. Opcional: Eliminamos las dependencias de desarrollo para aligerar la imagen
RUN npm prune --production


# --- ETAPA 2: EJECUCIÓN (Runtime) ---
# Usamos 'slim' que es más ligera pero compatible
FROM node:20-slim AS runtime
WORKDIR /app

# 6. Instalamos SOLO las librerías del SO que se necesitan para correr
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 7. Copiamos solo lo necesario desde la etapa de "construcción"
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 8. ¡¡LA LÍNEA MÁS IMPORTANTE!!
# Copiamos el navegador Chromium que descargamos en la etapa anterior
COPY --from=builder /app/.cache ./.cache

# Exponemos el puerto
EXPOSE 3000

# El comando de inicio que Render usará
CMD ["node", "dist/main"]