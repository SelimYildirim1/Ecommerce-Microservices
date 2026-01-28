# 1. Altyapı: Next.js 16 için Node.js 20 (Alpine)
FROM node:20-alpine

# 2. Çalışma klasörünü ayarla
WORKDIR /app

# 3. Paket listelerini kopyala ve yükle
COPY package*.json ./
RUN npm install

# 4. Tüm proje dosyalarını kopyala
COPY . .

# 5. Projeyi derle (Production Build)
RUN npm run build

# 6. Uygulama 3000 portunda çalışacak
EXPOSE 3000

# 7. Başlatma komutu
CMD ["npm", "start"]