import { readFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { getKmciWeather } from "./server/weather-kmci.mjs";
import {
  approveGateChange,
  rejectGateChange,
  ensureDefaultSession,
  joinSession,
  offerNewFlight,
  passengerByToken,
  readSession,
  simulateInboundDelay,
  subscribeSse,
  acceptOffer,
  completeStationTask,
} from "./server/simulation-store.mjs";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function detectLanOrigin(server, req) {
  const advertised = server.resolvedUrls?.network?.find((url) => url.startsWith("http://"));
  if (advertised) return advertised.replace(/\/$/, "");

  const port = req.socket?.localPort;
  if (!port) return null;
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const ipv4 = entry.family === "IPv4" || entry.family === 4;
      if (!ipv4 || entry.internal || entry.address.startsWith("169.254.")) continue;
      addresses.push(entry.address);
    }
  }
  const address =
    addresses.find(
      (ip) => ip.startsWith("192.168.") || ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip),
    ) ?? addresses[0];
  return address ? `http://${address}:${port}` : null;
}

function readNgrokToken() {
  if (process.env.NGROK_AUTHTOKEN?.trim()) return process.env.NGROK_AUTHTOKEN.trim();
  const files = [
    join(process.cwd(), ".ngrok-token"),
    join(os.homedir(), ".ngrok2", "ngrok.yml"),
    join(process.env.LOCALAPPDATA ?? "", "ngrok", "ngrok.yml"),
  ];
  for (const file of files) {
    try {
      const text = readFileSync(file, "utf8");
      const token = file.endsWith(".yml")
        ? text.match(/authtoken:\s*(\S+)/)?.[1]?.trim()
        : text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line && !line.startsWith("#"));
      if (token && !token.includes(" ") && token.length > 8) return token;
    } catch {
      /* this source is not configured */
    }
  }
  return null;
}

export function simulationApiPlugin() {
  let publicOrigin = null;
  let opening = null;

  function openTunnel(server) {
    if (publicOrigin || opening) return opening;
    const address = server.httpServer?.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) return null;
    const authtoken = readNgrokToken();
    if (!authtoken) {
      server.config.logger.warn(
        "No ngrok authtoken yet. Put it in NGROK_AUTHTOKEN or .ngrok-token, then restart. The QR stays on the local Wi-Fi address until then.",
      );
      opening = Promise.resolve(null);
      return opening;
    }
    opening = import("@ngrok/ngrok")
      .then((ngrok) => ngrok.forward({ addr: `127.0.0.1:${port}`, authtoken }))
      .then((listener) => {
        publicOrigin = listener.url()?.replace(/\/$/, "") ?? null;
        if (publicOrigin) {
          server.config.logger.info(`Passenger demo public link: ${publicOrigin}/passenger`);
        }
        server.httpServer?.once("close", () => {
          void listener.close();
        });
        return publicOrigin;
      })
      .catch((error) => {
        opening = null;
        const message = error instanceof Error ? error.message : String(error);
        server.config.logger.warn(
          `ngrok tunnel failed (${message}). A phone on the same Wi-Fi can still scan the local address.`,
        );
        return null;
      });
    return opening;
  }

  const attach = (server) => {
    server.httpServer?.once("listening", () => {
      void openTunnel(server);
    });
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/simulation") && !req.url?.startsWith("/api/weather")) return next();
      const url = new URL(req.url, "http://localhost");

      try {
        if (url.pathname === "/api/weather/kmci" && req.method === "GET") {
          try {
            return sendJson(res, 200, await getKmciWeather());
          } catch (error) {
            return sendJson(res, 503, {
              error: error instanceof Error ? error.message : "weather_unavailable",
            });
          }
        }
        if (url.pathname === "/api/simulation/session" && req.method === "GET") {
          return sendJson(res, 200, ensureDefaultSession());
        }

        if (url.pathname === "/api/simulation/lan-origin" && req.method === "GET") {
          if (!publicOrigin) void openTunnel(server);
          return sendJson(res, 200, {
            origin: publicOrigin || detectLanOrigin(server, req),
            public: Boolean(publicOrigin),
          });
        }

        if (url.pathname === "/api/simulation/state" && req.method === "GET") {
          const sessionId = url.searchParams.get("sessionId");
          const state = sessionId ? readSession(sessionId) : ensureDefaultSession();
          if (!state) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, state);
        }

        if (url.pathname === "/api/simulation/events" && req.method === "GET") {
          const sessionId = url.searchParams.get("sessionId");
          if (!sessionId) return sendJson(res, 400, { error: "session_required" });
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          const unsubscribe = subscribeSse(sessionId, res);
          req.on("close", unsubscribe);
          return;
        }

        if (url.pathname === "/api/simulation/join" && req.method === "POST") {
          const body = await readBody(req);
          const result = joinSession(body.sessionId, body.token ?? null);
          if (result.error) return sendJson(res, 409, result);
          return sendJson(res, 200, result);
        }

        if (url.pathname === "/api/simulation/passenger" && req.method === "GET") {
          const sessionId = url.searchParams.get("sessionId");
          const token = url.searchParams.get("token");
          const passenger = passengerByToken(sessionId, token);
          if (!passenger) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, { passenger });
        }

        if (url.pathname === "/api/simulation/delay" && req.method === "POST") {
          const body = await readBody(req);
          const state = simulateInboundDelay(body.sessionId);
          if (!state) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, state);
        }

        if (url.pathname === "/api/simulation/approve-gate" && req.method === "POST") {
          const body = await readBody(req);
          const state = approveGateChange(body.sessionId);
          if (!state) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, state);
        }

        if (url.pathname === "/api/simulation/reject-gate" && req.method === "POST") {
          const body = await readBody(req);
          const state = rejectGateChange(body.sessionId);
          if (!state) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, state);
        }

        if (url.pathname === "/api/simulation/offer" && req.method === "POST") {
          const body = await readBody(req);
          const state = offerNewFlight(body.sessionId, body.passengerId);
          if (!state) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, state);
        }

        if (url.pathname === "/api/simulation/accept-offer" && req.method === "POST") {
          const body = await readBody(req);
          const result = acceptOffer(body.sessionId, body.token);
          if (result.error && !result.state) return sendJson(res, 400, result);
          return sendJson(res, 200, result);
        }

        if (url.pathname === "/api/simulation/complete-task" && req.method === "POST") {
          const body = await readBody(req);
          const state = completeStationTask(body.sessionId, body.taskId);
          if (!state) return sendJson(res, 404, { error: "not_found" });
          return sendJson(res, 200, state);
        }

        return sendJson(res, 404, { error: "unknown_route" });
      } catch (error) {
        return sendJson(res, 500, { error: error instanceof Error ? error.message : "server_error" });
      }
    });
  };

  return {
    name: "simulation-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}