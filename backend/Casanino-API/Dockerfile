FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/Casanino-API/Casanino-API.csproj .
RUN dotnet restore "Casanino-API.csproj"

COPY backend/Casanino-API/ .
RUN dotnet publish "Casanino-API.csproj" -c Release --no-restore -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV PORT=8080
EXPOSE 80
USER app
ENTRYPOINT ["dotnet", "Casanino-API.dll"]