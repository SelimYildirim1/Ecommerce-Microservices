# 1. Aşama: Build (İnşaat)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Proje dosyalarını kopyala
COPY . .

# Bağımlılıkları yükle ve projeyi derle
# (Core.Shared gibi ortak katmanlar varsa onları da görür)
RUN dotnet restore "src/Services/Payment.API/Payment.API.csproj"
RUN dotnet publish "src/Services/Payment.API/Payment.API.csproj" -c Release -o /app/out

# 2. Aşama: Runtime (Çalıştırma)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Docker içinde API 8080 portundan yayın yapar
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Payment.API.dll"]