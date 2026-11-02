FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /src
COPY src/TimeMcp.WorldClock ./TimeMcp.WorldClock
WORKDIR /src/TimeMcp.WorldClock
CMD ["dotnet", "run"]
