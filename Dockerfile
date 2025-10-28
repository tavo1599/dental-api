# --- ETAPA 1: CONSTRUCCIÓN (Builder) ---
# Usamos una imagen de Node.js 20 (basada en Debian)
FROM node:20 AS builder
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# --- INICIO DE LA CORRECCIÓN ---
# 1. Copiamos el resto del código (incluyendo src/ y tsconfig.json)
#    ANTES de instalar
COPY . .
# --- FIN DE LA CORRECCIÓN ---

# 2. Instalamos las dependencias de npm
#    Ahora, si 'npm install' ejecuta 'npm run build', encontrará tsconfig.json
RUN npm install

# 3. Construimos la aplicación (compilamos de TS a JS)
#    Si 'npm install' ya lo hizo (por un script postinstall),
#    este comando será redundante, pero no fallará.
RUN npm run build

# Opcional: Eliminamos las dependencias de desarrollo
RUN npm prune --production


# --- ETAPA 2: EJECUCIÓN (Runtime) ---
# (Esta etapa estaba bien, la dejamos igual)
FROM node:20-slim AS runtime
WORKDIR /app

# Instalamos las librerías del SO Y el navegador para Puppeteer
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

# Le decimos a Puppeteer DÓNDE encontrar el ejecutable
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copiamos los archivos de la aplicación
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponemos el puerto
EXPOSE 3000

# Comando de inicio
# Comando de inicio
CMD ["node", "dist/index"]