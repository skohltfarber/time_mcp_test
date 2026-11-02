using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var windowPath = Path.Combine(AppContext.BaseDirectory, "processing-window.json");
var window = JsonSerializer.Deserialize<WindowSettings>(File.ReadAllText(windowPath))
    ?? throw new InvalidOperationException("processing-window.json is missing start and end.");
var start = TimeOnly.Parse(window.Start);
var end = TimeOnly.Parse(window.End);

var locations = new object[]
{
    new { query = "London" }, new { query = "Dublin" }, new { query = "Lisbon" },
    new { query = "Paris" }, new { query = "Berlin" }, new { query = "Madrid" },
    new { query = "Rome" }, new { query = "Amsterdam" }, new { query = "Brussels" },
    new { query = "Vienna" }, new { query = "Prague" }, new { query = "Warsaw" },
    new { query = "Budapest" }, new { query = "Stockholm" }, new { query = "Copenhagen" },
    new { query = "Oslo" }, new { timezone = "Europe/Zurich" },
    new { query = "Athens" }, new { query = "Helsinki" }, new { query = "Bucharest" },
};

using var http = new HttpClient();
http.DefaultRequestHeaders.UserAgent.ParseAdd("TimeMcpSample/1.0");
http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

var payload = JsonSerializer.Serialize(new
{
    jsonrpc = "2.0",
    id = 1,
    method = "tools/call",
    @params = new { name = "get_current_time", arguments = new { locations } },
});
using var body = new StringContent(payload, Encoding.UTF8, "application/json");
using var response = await http.PostAsync("https://worldclock.pro/mcp", body);
response.EnsureSuccessStatusCode();
using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
var text = doc.RootElement.GetProperty("result").GetProperty("content")[0].GetProperty("text").GetString()
    ?? throw new InvalidOperationException("World Clock Pro returned no text.");
var places = JsonSerializer.Deserialize<List<PlaceTime>>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
    ?? [];

var openCount = 0;
foreach (var place in places)
{
    var local = TimeOnly.Parse(place.Time);
    var open = IsOpen(local, start, end);
    if (open) openCount++;
    var label = place.Location?.City ?? place.Location?.Label ?? place.Timezone;
    var reason = open
        ? $"inside {window.Start}–{window.End}"
        : $"before {window.Start}";
    Console.WriteLine($"{label}  {place.Timezone}  {place.Time}  {place.UtcOffset}  {(open ? "YES" : "NO")}  {reason}");
}

Console.WriteLine($"Can process: {openCount} of {places.Count}");

static bool IsOpen(TimeOnly local, TimeOnly start, TimeOnly end) =>
    end <= start ? local >= start || local < end : local >= start && local < end;

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
