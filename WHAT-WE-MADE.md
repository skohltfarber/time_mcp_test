# What we made

The World Clock Pro call looks up the current local time for a city. Our servers calculate from GMT, so the page also shows that instant in GMT and whether it is daylight saving time.

The window is open from 4:00 AM inclusive until midnight exclusive in that city’s local time. The start and end are loaded from `processing-window.json`, shaped like a database row. The log tells backend folks to execute the service call, or not to execute it because it is locked out until 4:00 AM local.

One `get_current_time` to https://worldclock.pro/mcp does this. The local API on port 5080 only forwards it. The page is a dropdown of cities and time zones, plus a log line per city.

At Sunday, Nov 1, 2026, 7:42 PM CT the European cities in the sample were between 1:42 AM and 3:42 AM, so none were inside the default window.
