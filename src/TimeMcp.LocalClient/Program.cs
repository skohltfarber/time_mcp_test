using ModelContextProtocol.Client;

var serverProject = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "TimeMcp.Server"));
var transport = new StdioClientTransport(new StdioClientTransportOptions
{
    Name = "TimeMcp.Server",
    Command = "dotnet",
    Arguments = ["run", "--project", serverProject],
});

await using var client = await McpClient.CreateAsync(transport);

await Call("GetCurrentTime", new Dictionary<string, object?> { ["timezone"] = "America/Chicago" });
await Call("ConvertTime", new Dictionary<string, object?>
{
    ["dateTime"] = "2026-11-02T09:00",
    ["fromZone"] = "America/Chicago",
    ["toZone"] = "Europe/London",
});
await Call("DurationBetween", new Dictionary<string, object?>
{
    ["start"] = "2026-11-02T04:00:00-06:00",
    ["end"] = "2026-11-02T16:00:00-06:00",
});

async Task Call(string name, Dictionary<string, object?> args)
{
    var result = await client.CallToolAsync(name, args);
    Console.WriteLine($"{name}: {result}");
}
