# Time MCP sample

The World Clock Pro call looks up the current local time for a city. Our servers calculate from GMT, so the page also shows that instant in GMT and whether it is daylight saving time. The window is open from 4:00 AM inclusive until midnight exclusive in that city’s local time. The log tells backend folks to execute the service call, or not to execute it because it is locked out until 4:00 AM local.

One `get_current_time` to https://worldclock.pro/mcp does this. The local API on port 5080 only forwards it. The page is a dropdown of cities and time zones, plus a log line per city.

C# MCP server, a World Clock Pro client, a local API, and a React page.

## Projects

- `src/TimeMcp.Server` — stdio MCP server. Tools: `GetCurrentTime`, `ConvertTime`, `DurationBetween`.
- `src/TimeMcp.LocalClient` — starts that server and calls each tool once.
- `src/TimeMcp.WorldClock` — calls `https://worldclock.pro/mcp` and prints YES or NO for the processing window.
- `src/TimeMcp.Api` — `http://localhost:5080`. Forwards `get_current_time` to World Clock Pro. The browser does not call World Clock Pro directly.
- `web` — React page. A dropdown of cities and IANA time zones, and a log line per city.

## Processing window

`src/TimeMcp.WorldClock/processing-window.json` holds `start` and `end`. The default is `04:00` through `00:00` (midnight, exclusive). `WindowSettings` in the World Clock client and the API is the stand-in for a database row. Replace that file read with a database query when you have one.

Zurich is sent as the IANA zone `Europe/Zurich`. The city name alone matches Lake Zurich, Illinois.

## Docker

From the parent directory, with Docker running:

```bash
cd time_mcp_test
docker compose up --build
```

- Page: http://localhost:5173
- API: http://localhost:5080

The page in your browser calls `http://localhost:5080`. Leave both containers running, then pick a city or check all cities. Each city gets a log line.

To print the processing-window check and the local stdio client in the terminal, from `time_mcp_test`:

```bash
cd time_mcp_test
docker compose --profile check run --rm worldclock
docker compose --profile check run --rm local
```

Stop the page and API with `docker compose down`.

## Publish

From the parent directory, `cd time_mcp_test`. Create a GitHub repository and push that folder. The workflows in `.github/workflows` run on that push and on later pull requests. `security.yml` scans for secrets with gitleaks, runs `npm audit` in `web/`, and checks `src/TimeMcp.Api` for vulnerable NuGet packages. `build.yml` runs `docker compose config` and `npm run build` in `web/`. Those checks do not start the compose stack. The workflow working directories stay `web` and the Api project path stays `src/TimeMcp.Api`, because that folder is the repository root.

The site is the Vite app in `web/` plus the API.

https://skohltfarber.github.io/time_mcp_test/ serves the page. `pages.yml` builds `web/` with Vite base `/time_mcp_test/` and deploys `web/dist` to GitHub Pages on each push to `main`. Pages does not run the API. The lockout check needs a published API.

The Pages build does not call `http://localhost:5080`. It uses `VITE_API_URL` when that variable is set at build time, and otherwise leaves the API URL empty. Local `npm run dev` still uses `http://localhost:5080` from `web/.env.development`. Set `VITE_API_URL` to the published API and rebuild before the public page can run the check.

To publish the API as well, add a workflow that builds the images in `docker/api.Dockerfile` and `docker/web.Dockerfile`, pushes them to GitHub Container Registry, and runs them on a host you control.

## Run without Docker

From the parent directory, with the .NET 8 SDK on `PATH` (`$HOME/.dotnet` on Shawn’s laptop):

```bash
cd time_mcp_test
dotnet run --project src/TimeMcp.LocalClient
dotnet run --project src/TimeMcp.WorldClock
dotnet run --project src/TimeMcp.Api
```

In another terminal:

```bash
cd time_mcp_test/web
npm install
npm run dev
```

Open `http://localhost:5173`. The API must already be running on port 5080.

## Reading from Sunday, Nov 1, 2026, 7:42 PM CT

London, Dublin, and Lisbon were 1:42 AM GMT. The Central European cities, including Zurich, were 2:42 AM. Athens, Helsinki, and Bucharest were 3:42 AM. None were inside the default window.
