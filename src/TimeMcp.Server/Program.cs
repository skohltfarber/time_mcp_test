using System.ComponentModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;

var builder = Host.CreateApplicationBuilder(args);
builder.Logging.AddConsole(options =>
{
    options.LogToStandardErrorThreshold = LogLevel.Trace;
});
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();
await builder.Build().RunAsync();

[McpServerToolType]
public static class TimeTools
{
    [McpServerTool, Description("Current time in an IANA time zone, as ISO-8601.")]
    public static string GetCurrentTime(
        [Description("IANA time zone id. Defaults to America/Chicago.")] string timezone = "America/Chicago")
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timezone);
        return TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).ToString("o");
    }

    [McpServerTool, Description("Convert a datetime from one IANA time zone to another.")]
    public static string ConvertTime(
        [Description("Local datetime, for example 2026-11-02T09:00.")] string dateTime,
        [Description("Source IANA time zone.")] string fromZone,
        [Description("Target IANA time zone.")] string toZone)
    {
        var source = TimeZoneInfo.FindSystemTimeZoneById(fromZone);
        var target = TimeZoneInfo.FindSystemTimeZoneById(toZone);
        var unspecified = DateTime.Parse(dateTime, null, System.Globalization.DateTimeStyles.RoundtripKind);
        var offset = new DateTimeOffset(DateTime.SpecifyKind(unspecified, DateTimeKind.Unspecified), source.GetUtcOffset(unspecified));
        return TimeZoneInfo.ConvertTime(offset, target).ToString("o");
    }

    [McpServerTool, Description("Duration between two ISO-8601 instants.")]
    public static string DurationBetween(
        [Description("Start instant.")] string start,
        [Description("End instant.")] string end)
    {
        var span = DateTimeOffset.Parse(end) - DateTimeOffset.Parse(start);
        return span.ToString();
    }
}
