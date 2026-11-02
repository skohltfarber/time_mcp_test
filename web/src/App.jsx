import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";
const WORLD_CLOCK = "https://worldclock.pro/mcp";

const PLACES = [
  { city: "London", timezone: "Europe/London" },
  { city: "Dublin", timezone: "Europe/Dublin" },
  { city: "Lisbon", timezone: "Europe/Lisbon" },
  { city: "Paris", timezone: "Europe/Paris" },
  { city: "Berlin", timezone: "Europe/Berlin" },
  { city: "Madrid", timezone: "Europe/Madrid" },
  { city: "Rome", timezone: "Europe/Rome" },
  { city: "Amsterdam", timezone: "Europe/Amsterdam" },
  { city: "Brussels", timezone: "Europe/Brussels" },
  { city: "Vienna", timezone: "Europe/Vienna" },
  { city: "Prague", timezone: "Europe/Prague" },
  { city: "Warsaw", timezone: "Europe/Warsaw" },
  { city: "Budapest", timezone: "Europe/Budapest" },
  { city: "Stockholm", timezone: "Europe/Stockholm" },
  { city: "Copenhagen", timezone: "Europe/Copenhagen" },
  { city: "Oslo", timezone: "Europe/Oslo" },
  { city: "Zurich", timezone: "Europe/Zurich" },
  { city: "Athens", timezone: "Europe/Athens" },
  { city: "Helsinki", timezone: "Europe/Helsinki" },
  { city: "Bucharest", timezone: "Europe/Bucharest" },
  { city: "New York", timezone: "America/New_York" },
];

let inflight = null;
let lineKey = 0;

function minutes(value) {
  const [hour, minute, second = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute) + Number(second) / 60;
}

function isOpen(localTime, start, end) {
  const local = minutes(localTime);
  const openStart = minutes(start);
  const openEnd = minutes(end);
  return openEnd <= openStart ? local >= openStart || local < openEnd : local >= openStart && local < openEnd;
}

function formatWindowTime(hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatGmt(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso)).replace(/\s+/g, " ").trim();
}

function decisionLine({ city, time12, abbreviation, isDST, gmt, open, lockedUntil }) {
  const saving = isDST ? "daylight saving time" : "not daylight saving time";
  const when = `${city} ${time12} ${abbreviation}, ${saving} (GMT ${gmt})`;
  if (open) return `${when}. Execute the service call.`;
  return `${when}. Do not execute the service call. Locked out until ${lockedUntil} local.`;
}

async function readWindow() {
  const response = await fetch(`${API}/window`);
  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  return JSON.parse(text);
}

async function readZones(timezones) {
  const response = await fetch(`${API}/tools/get_current_time`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations: timezones.map((timezone) => ({ timezone })) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  const payload = JSON.parse(text);
  const places = JSON.parse(payload.result.content[0].text);
  const byZone = new Map(places.map((place) => [place.timezone, place]));
  const missing = timezones.filter((timezone) => !byZone.has(timezone));
  if (missing.length) throw new Error(`World Clock Pro did not return ${missing.join(", ")}.`);
  return byZone;
}

function describe(city, place, settings) {
  const open = isOpen(place.time, settings.start, settings.end);
  const gmt = formatGmt(place.iso);
  return {
    key: ++lineKey,
    city,
    timezone: place.timezone,
    place,
    gmt,
    open,
    text: decisionLine({
      city,
      time12: place.time12,
      abbreviation: place.abbreviation,
      isDST: place.isDST,
      gmt,
      open,
      lockedUntil: formatWindowTime(settings.start),
    }),
  };
}

function checkZones(entries) {
  return Promise.all([readWindow(), readZones(entries.map((entry) => entry.timezone))]).then(([settings, byZone]) => {
    const lines = entries.map((entry) => describe(entry.city, byZone.get(entry.timezone), settings));
    return { settings, lines };
  });
}

export default function App() {
  const [timezone, setTimezone] = useState("America/New_York");
  const [settings, setSettings] = useState(null);
  const [focus, setFocus] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(Boolean(API));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(next) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ ...next, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 8000);
  }

  function remember(nextSettings, lines, selectedTimezone) {
    setSettings(nextSettings);
    setLog((current) => [...lines, ...current]);
    const focusLine = lines.find((line) => line.timezone === selectedTimezone) || lines[0];
    setFocus(focusLine);
    return focusLine;
  }

  async function checkSelected() {
    if (!API) return;
    const entry = PLACES.find((place) => place.timezone === timezone);
    setChecking(true);
    setError("");
    showToast({
      tone: "pending",
      title: "Testing local time",
      message: `Looking up ${entry.city} on World Clock Pro.`,
    });
    try {
      const { settings: nextSettings, lines } = await checkZones([entry]);
      const focusLine = remember(nextSettings, lines, entry.timezone);
      showToast({
        tone: focusLine.open ? "execute" : "locked",
        title: focusLine.open ? "Execute the service call" : "Do not execute the service call",
        message: focusLine.text,
      });
    } catch (caught) {
      setError(caught.message);
      showToast({ tone: "locked", title: "Time check failed", message: caught.message });
    } finally {
      setChecking(false);
    }
  }

  async function checkAll() {
    if (!API) return;
    setChecking(true);
    setError("");
    showToast({
      tone: "pending",
      title: "Testing local time",
      message: "Looking up every city on World Clock Pro.",
    });
    try {
      const { settings: nextSettings, lines } = await checkZones(PLACES);
      remember(nextSettings, lines, timezone);
      const allowed = lines.filter((line) => line.open).length;
      showToast({
        tone: allowed === lines.length ? "execute" : allowed === 0 ? "locked" : "pending",
        title: "Time check finished",
        message: `${lines.length} cities. Execute the service call at ${allowed}. Do not execute at ${lines.length - allowed}.`,
      });
    } catch (caught) {
      setError(caught.message);
      showToast({ tone: "locked", title: "Time check failed", message: caught.message });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!API) return undefined;
    let active = true;
    const entry = PLACES.find((place) => place.timezone === "America/New_York");
    if (!inflight) inflight = checkZones([entry]);
    inflight
      .then(({ settings: nextSettings, lines }) => {
        if (!active) return;
        setSettings(nextSettings);
        setLog((current) => [...lines, ...current]);
        setFocus(lines[0]);
        showToast({
          tone: lines[0].open ? "execute" : "locked",
          title: lines[0].open ? "Execute the service call" : "Do not execute the service call",
          message: lines[0].text,
        });
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      })
      .finally(() => {
        inflight = null;
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <header>
        <p className="service">World Clock Pro</p>
        <h1>Is the service call allowed?</h1>
        <p className="lede">
          Pick a city and see whether a backend service call is allowed right now. The decision uses that city’s local time. Servers that calculate from GMT can read the same instant in the log line.
        </p>
        <p>
          Each check is one World Clock Pro lookup at{" "}
          <a href={WORLD_CLOCK}>{WORLD_CLOCK}</a>
          {" "}for the city’s IANA zone. The local API only forwards that call. City names are not searched.
        </p>
        {API ? null : (
          <p>
            The lockout check needs a published API. This static site does not call localhost. Set <code>VITE_API_URL</code> to that API when you build the page.
          </p>
        )}
      </header>

      <section>
        <h2>Current window</h2>
        <p>
          Open from 4:00 AM inclusive until midnight exclusive in the city’s local time. Before 4:00 AM the call is locked out.
        </p>
        <p>The start and end come from the sample settings (the JSON stand-in).</p>
        {settings ? (
          <p className="window-values">
            Current window: <strong>{settings.start}</strong> to <strong>{settings.end}</strong>
          </p>
        ) : (
          <p className="window-values">{checking ? "Reading the sample settings…" : "Sample settings are not loaded yet."}</p>
        )}
      </section>

      <section className="primary-panel">
        <h2>City</h2>
        <label htmlFor="city">City and timezone</label>
        <select id="city" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          {PLACES.map((place) => (
            <option key={place.timezone} value={place.timezone}>
              {place.city} — {place.timezone}
            </option>
          ))}
        </select>
        <div className="row">
          <button className="primary" onClick={checkSelected} disabled={checking || !API}>
            {checking ? "Checking…" : "Check this city"}
          </button>
          <button className="secondary" onClick={checkAll} disabled={checking || !API}>
            Check all cities
          </button>
        </div>
        {error ? <p className="err">{error}</p> : null}
        {focus ? (
          <dl className="facts">
            <div>
              <dt>City</dt>
              <dd>{focus.city}</dd>
            </div>
            <div>
              <dt>Local time</dt>
              <dd>{focus.place.time12} <span className="tz">{focus.place.abbreviation}</span></dd>
            </div>
            <div>
              <dt>Daylight saving time</dt>
              <dd>{focus.place.isDST ? `Yes. ${focus.place.zoneName}.` : `No. ${focus.place.zoneName}.`}</dd>
            </div>
            <div>
              <dt>GMT</dt>
              <dd>{focus.gmt}</dd>
            </div>
          </dl>
        ) : (
          <p className="quiet">{checking ? "Looking up the selected city." : "Choose a city and check it."}</p>
        )}
      </section>

      <section>
        <div className="section-title">
          <h2>Service call log</h2>
          <span className="service">World Clock Pro</span>
        </div>
        <p>One line per city. The newest check is at the top. Each line tells backend folks whether to execute the service call.</p>
        {log.length === 0 ? <p className="quiet">{checking ? "Waiting for the first check." : "No checks yet."}</p> : null}
        <ul className="log">
          {log.map((entry) => (
            <li key={entry.key} className={entry.open ? "ok" : "err"}>{entry.text}</li>
          ))}
        </ul>
      </section>

      {toast ? (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
          <div>
            <p className="toast-title">{toast.title}</p>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => setToast(null)}>Close</button>
        </div>
      ) : null}

      <footer className="stream">
        <span className="service">World Clock Pro</span>
        <p>{focus?.text || (checking ? "Checking whether to execute the service call." : "The execution line appears here.")}</p>
      </footer>
    </main>
  );
}
