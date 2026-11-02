using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient("worldclock", client =>
{
    client.BaseAddress = new Uri("https://worldclock.pro/mcp");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("TimeMcpSample/1.0");
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
});
var app = builder.Build();
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    context.Response.Headers.Append("Access-Control-Allow-Headers", "content-type");
    context.Response.Headers.Append("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        return;
    }
    await next();
});

var windowPath = Path.Combine(AppContext.BaseDirectory, "processing-window.json");

app.MapGet("/window", () => Results.Text(File.ReadAllText(windowPath), "application/json"));

app.MapPost("/tools/{name}", async (string name, JsonElement arguments, IHttpClientFactory factory) =>
{
    var http = factory.CreateClient("worldclock");
    var payload = JsonSerializer.Serialize(new
    {
        jsonrpc = "2.0",
        id = 1,
        method = "tools/call",
        @params = new { name, arguments },
    });
    using var content = new StringContent(payload, Encoding.UTF8, "application/json");
    using var response = await http.PostAsync("", content);
    var text = await response.Content.ReadAsStringAsync();
    return Results.Text(text, "application/json", statusCode: (int)response.StatusCode);
});

app.MapPost("/window/check", async (JsonElement body, IHttpClientFactory factory) =>
{
    var settings = JsonSerializer.Deserialize<WindowSettings>(File.ReadAllText(windowPath))!;
    var http = factory.CreateClient("worldclock");
    var payload = JsonSerializer.Serialize(new
    {
        jsonrpc = "2.0",
        id = 1,
        method = "tools/call",
        @params = new { name = "get_current_time", arguments = body },
    });
    using var content = new StringContent(payload, Encoding.UTF8, "application/json");
    using var response = await http.PostAsync("", content);
    using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    var text = doc.RootElement.GetProperty("result").GetProperty("content")[0].GetProperty("text").GetString()!;
    var places = JsonSerializer.Deserialize<List<PlaceTime>>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    var start = TimeOnly.Parse(settings.Start);
    var end = TimeOnly.Parse(settings.End);
    var rows = places.Select(place =>
    {
        var local = TimeOnly.Parse(place.Time);
        var open = end <= start ? local >= start || local < end : local >= start && local < end;
        return new
        {
            city = place.Location?.City ?? place.Location?.Label ?? place.Timezone,
            place.Timezone,
            place.Time,
            place.UtcOffset,
            canProcess = open,
            reason = open ? $"inside {settings.Start}–{settings.End}" : $"before {settings.Start}",
        };
    }).ToList();
    return Results.Json(new { start = settings.Start, end = settings.End, rows, canProcess = rows.Count(row => row.canProcess) });
});

app.Run("http://0.0.0.0:5080");

sealed class WindowSettings
{
    public string Start { get; set; } = "04:00";
    public string End { get; set; } = "00:00";
}

sealed class PlaceTime
{
    public PlaceLocation? Location { get; set; }
    public string Timezone { get; set; } = "";
    public string Time { get; set; } = "";
    public string UtcOffset { get; set; } = "";
}

sealed class PlaceLocation
{
    public string? Label { get; set; }
    public string? City { get; set; }
}
