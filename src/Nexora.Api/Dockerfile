FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props ./
COPY src/Nexora.Api ./src/Nexora.Api
RUN dotnet publish src/Nexora.Api/Nexora.Api.csproj -c Release -o /app/publish
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet","Nexora.Api.dll"]
