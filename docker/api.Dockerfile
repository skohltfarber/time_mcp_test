FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /src
COPY src/TimeMcp.Api ./TimeMcp.Api
COPY src/TimeMcp.WorldClock/processing-window.json ./TimeMcp.WorldClock/processing-window.json
WORKDIR /src/TimeMcp.Api
EXPOSE 5080
ENV ASPNETCORE_URLS=http://0.0.0.0:5080
CMD ["dotnet", "run", "--urls", "http://0.0.0.0:5080"]
