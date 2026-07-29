# 1. Aşama: Build (İnşaat)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Proje dosyalarını kopyala
COPY . .

# Bağımlılıkları yükle ve projeyi derle
# (Core.Shared gibi ortak katmanlar varsa onları da görür)
RUN dotnet restore "src/Services/Catalog.API/Catalog.API.csproj"
RUN dotnet publish "src/Services/Catalog.API/Catalog.API.csproj" -c Release -o /app/out

# 2. Aşama: Runtime (Çalıştırma)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Yuklenen urun gorselleri icin kalici dizin (docker-compose'da volume baglanir)
RUN mkdir -p /app/wwwroot/uploads

# Docker içinde API 8080 portundan yayın yapar
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Catalog.API.dll"]