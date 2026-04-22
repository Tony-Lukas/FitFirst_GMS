const http = require("http");
const { Server } = require("socket.io");
const { loadEnv } = require("./scripts/load-env");

loadEnv();

const port = Number(process.env.SOCKET_PORT || 4001);
const secret = process.env.SOCKET_SERVER_SECRET;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/internal/broadcast") {
    if (!secret || req.headers["x-socket-secret"] !== secret) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        const { event, payload } = JSON.parse(raw || "{}");
        if (event) {
          io.emit(event, payload);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid payload" }));
      }
    });

    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "fitfirst-socket-server" }));
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true, at: new Date().toISOString() });
});

server.listen(port, () => {
  console.log(`Socket server listening on http://localhost:${port}`);
});
