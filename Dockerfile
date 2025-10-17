# --- ETAPA 1: CONSTRUCCIÓN (Builder) ---
# Usamos una imagen de Node.js 20 (basada en Debian)
FROM node:20 AS builder
WORKDIR /app

# --- CORRECCIÓN CLAVE ---
# 1. Define la variable de entorno DENTRO del build.
ENV PUPPETEER_CACHE_DIR=/app/.cache
# --- FIN DE LA CORRECCIÓN ---

# 2. Instala las librerías del SO que Puppeteer necesita
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

# 3. Instalamos las dependencias (npm install ahora usará la ENV)
# Puppeteer descargará Chromium en /app/.cache
RUN npm install

# Copiamos el resto del código
COPY . .

# 4. Construimos la aplicación (compilamos de TS a JS)
RUN npm run build

# 5. Opcional: Eliminamos las dependencias de desarrollo
RUN npm prune --production


# --- ETAPA 2: EJECUCIÓN (Runtime) ---
# Usamos 'slim' que es más ligera pero compatible
FROM node:20-slim AS runtime
WORKDIR /app

# 6. Define la misma ENV para el runtime
ENV PUPPETEER_CACHE_DIR=/app/.cache

# 7. Instala SOLO las librerías del SO que se necesitan para correr
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

# 8. Copiamos solo lo necesario desde la etapa de "construcción"
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 9. ¡¡LA LÍNEA MÁS IMPORTANTE!!
# Copiamos el navegador Chromium que SÍ se descargó en /app/.cache
COPY --from=builder /app/.cache ./.cache

# Exponemos el puerto
EXPOSE 3000

# El comando de inicio que Render usará
CMD ["node", "dist/main"]