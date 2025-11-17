# OpenLiQ Backend - Dockerfile

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file
COPY ["OpenLiQ.Api/OpenLiQ.Api.csproj", "OpenLiQ.Api/"]

# Restore dependencies
RUN dotnet restore "OpenLiQ.Api/OpenLiQ.Api.csproj"

# Copy source code
COPY . .

# Build
RUN dotnet build "OpenLiQ.Api/OpenLiQ.Api.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "OpenLiQ.Api/OpenLiQ.Api.csproj" -c Release -o /app/publish

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "OpenLiQ.Api.dll"]
