import http from "node:http";

const port = Number(process.env.PORT || 8787);
const upstream = "https://worldclock.pro/mcp";

const server = http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type, accept");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405, { "Content-Type": "text/plain" });
    response.end("POST only");
    return;
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const upstreamResponse = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": "Mozilla/5.0",
    },
    body: Buffer.concat(chunks),
  });
  const text = await upstreamResponse.text();
  response.writeHead(upstreamResponse.status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(text);
});

server.listen(port, "127.0.0.1");
console.log(`clock proxy listening on http://127.0.0.1:${port}`);
