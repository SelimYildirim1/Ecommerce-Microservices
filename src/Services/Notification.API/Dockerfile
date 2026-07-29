# 1. Aşama: Build (İnşaat)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

COPY . .

RUN dotnet restore "src/Services/Notification.API/Notification.API.csproj"
RUN dotnet publish "src/Services/Notification.API/Notification.API.csproj" -c Release -o /app/out

# 2. Aşama: Runtime (Çalıştırma)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Notification.API.dll"]
