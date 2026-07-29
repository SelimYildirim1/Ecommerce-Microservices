# 1. Aşama: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

COPY . .

RUN dotnet restore "src/Services/Promotion.API/Promotion.API.csproj"
RUN dotnet publish "src/Services/Promotion.API/Promotion.API.csproj" -c Release -o /app/out

# 2. Aşama: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Promotion.API.dll"]
