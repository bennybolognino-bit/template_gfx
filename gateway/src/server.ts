import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";

import { corePlugin } from "./plugins/core.js";
import { vmixPlugin } from "./plugins/vmix.js";
import type {
  GatewayContext,
  PluginDefinition,
} from "./types.js";

const PORT = Number(process.env.PORT ?? 3210);

const plugins = new Map<string, PluginDefinition>([
  [corePlugin.id, corePlugin],
  [vmixPlugin.id, vmixPlugin],
]);

const variables = new Map<string, unknown>();

const executeSchema = z.object({
  pluginId: z.string().min(1),
  actionId: z.string().min(1),
  options: z.record(z.string(), z.unknown()).default({}),
});

function variableKey(
  pluginId: string,
  variableId: string,
) {
  return `${pluginId}:${variableId}`;
}

function sendJson(
  response: http.ServerResponse,
  status: number,
  payload: unknown,
) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });

  response.end(JSON.stringify(payload));
}

async function readJson(
  request: http.IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalSize += buffer.length;

    if (totalSize > 1024 * 1024) {
      throw new Error("Richiesta troppo grande");
    }

    chunks.push(buffer);
  }

  if (!chunks.length) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(
  async (request, response) => {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "localhost"}`,
    );

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      sendJson(response, 200, {
        ok: true,
        service: "template-gfx-plugin-gateway",
        plugins: plugins.size,
      });
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/plugins"
    ) {
      const manifests = [...plugins.values()].map(
        ({ execute, ...manifest }) => manifest,
      );

      sendJson(response, 200, manifests);
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/variables"
    ) {
      sendJson(
        response,
        200,
        Object.fromEntries(variables.entries()),
      );
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/execute"
    ) {
      try {
        const body = await readJson(request);
        const command = executeSchema.parse(body);
        const plugin = plugins.get(command.pluginId);

        if (!plugin) {
          sendJson(response, 404, {
            ok: false,
            error: "Plugin non trovato",
          });
          return;
        }

        const context: GatewayContext = {
          setVariable(pluginId, variableId, value) {
            const key = variableKey(pluginId, variableId);
            variables.set(key, value);

            broadcast({
              type: "variable-update",
              pluginId,
              variableId,
              value,
            });
          },

          getVariable(pluginId, variableId) {
            return variables.get(
              variableKey(pluginId, variableId),
            );
          },

          broadcast,

          log(level, message) {
            console.log(
              `[${level.toUpperCase()}] ${plugin.id}: ${message}`,
            );
          },
        };

        const result = await plugin.execute(
          command.actionId,
          command.options,
          context,
        );

        const event = {
          type: "action-result",
          pluginId: command.pluginId,
          actionId: command.actionId,
          result,
        };

        broadcast(event);

        sendJson(response, 200, {
          ok: true,
          result,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Errore sconosciuto";

        sendJson(response, 400, {
          ok: false,
          error: message,
        });
      }

      return;
    }

    sendJson(response, 404, {
      ok: false,
      error: "Endpoint non trovato",
    });
  },
);

const webSocketServer = new WebSocketServer({
  server,
});

function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);

  for (const client of webSocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

webSocketServer.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "connected",
      service: "template-gfx-plugin-gateway",
    }),
  );
});

for (const plugin of plugins.values()) {
  for (const variable of plugin.variables) {
    variables.set(
      variableKey(plugin.id, variable.id),
      variable.initialValue ?? "",
    );
  }
}

server.listen(PORT, () => {
  console.log(
    `Template GFX Plugin Gateway: http://localhost:${PORT}`,
  );
  console.log(
    `WebSocket Gateway: ws://localhost:${PORT}`,
  );
});

