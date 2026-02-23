# 1. Altyapı: Next.js 16 için Node.js 20 (Alpine)
FROM node:20-alpine

# 2. Çalışma klasörünü ayarla
WORKDIR /app

# 3. Paket listelerini kopyala ve yükle
COPY package*.json ./
RUN npm install

# 4. Tüm proje dosyalarını kopyala
COPY . .

# 5. Build arg desteği (Kubernetes deploy için)
# Ingress modu:
#   docker build \
#     --build-arg NEXT_PUBLIC_API_GATEWAY_URL=http://e-commerce.local/api \
#     --build-arg NEXT_PUBLIC_SIGNALR_URL=http://e-commerce.local/signalr .
# Build arg verilmezse lib/api.ts'deki fallback değerler kullanılır.
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_SIGNALR_URL

# 6. Projeyi derle (Production Build)
RUN npm run build

# 7. Uygulama 3000 portunda çalışacak
EXPOSE 3000

# 8. Başlatma komutu
CMD ["npm", "start"]