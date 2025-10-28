# --- ETAPA 1: CONSTRUCCIÓN (Builder) ---
# Usamos una imagen de Node.js 20 (basada en Debian)
FROM node:20 AS builder
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias de npm
RUN npm install

# Copiamos el resto del código
COPY . .

# Construimos la aplicación (compilamos de TS a JS)
RUN npm run build

# Opcional: Eliminamos las dependencias de desarrollo
RUN npm prune --production


# --- ETAPA 2: EJECUCIÓN (Runtime) ---
# Usamos 'slim' que es más ligera pero compatible
FROM node:20-slim AS runtime
WORKDIR /app

# --- ESTA ES LA CORRECCIÓN CLAVE ---
# 1. Instalamos las librerías del SO Y el navegador con el nombre 'chromium'
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Le decimos a Puppeteer DÓNDE encontrar el ejecutable que acabamos de instalar
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# --- FIN DE LA CORRECCIÓN ---

# 3. Copiamos los archivos de la aplicación
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponemos el puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/main"]