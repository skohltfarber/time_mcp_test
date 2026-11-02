FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /src
COPY src/TimeMcp.Server ./TimeMcp.Server
COPY src/TimeMcp.LocalClient ./TimeMcp.LocalClient
WORKDIR /src/TimeMcp.LocalClient
CMD ["dotnet", "run"]
