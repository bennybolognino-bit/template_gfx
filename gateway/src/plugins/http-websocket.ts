import WebSocket from "ws";

import type {
  GatewayContext,
  PluginDefinition,
} from "../types.js";

type CachedWebSocket = {
  socket: WebSocket;
  url: string;
  connected: boolean;
  messageCount: number;
};

const sockets = new Map<string, CachedWebSocket>();
const pollingTimers = new Map<string, NodeJS.Timeout>();

function connectionKey(context: GatewayContext) {
  return context.connection?.id ??
    "http-websocket-default";
}

function parseJsonObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  const text = String(value ?? "").trim();

  if (!text) return {};

  const parsed = JSON.parse(text) as unknown;

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      `${label} deve essere un oggetto JSON`,
    );
  }

  return parsed as Record<string, unknown>;
}

function getConfiguration(context: GatewayContext) {
  const config = context.connection?.config ?? {};

  const baseUrl = String(
    config.baseUrl ?? "http://127.0.0.1:3000",
  );

  const websocketUrl = String(
    config.websocketUrl ?? "",
  );

  const timeout = Math.max(
    500,
    Number(config.timeout ?? 10000),
  );

  const base = new URL(baseUrl);

  if (!["http:", "https:"].includes(base.protocol)) {
    throw new Error(
      "L'indirizzo HTTP deve usare http:// o https://",
    );
  }

  if (
    websocketUrl &&
    !websocketUrl.startsWith("ws://") &&
    !websocketUrl.startsWith("wss://")
  ) {
    throw new Error(
      "Il WebSocket deve usare ws:// o wss://",
    );
  }

  return {
    baseUrl: base.toString(),
    websocketUrl,
    timeout,
    defaultHeaders: parseJsonObject(
      config.defaultHeaders,
      "Header predefiniti",
    ),
    authType: String(config.authType ?? "none"),
    username: String(config.username ?? ""),
    password: String(config.password ?? ""),
    token: String(config.token ?? ""),
    apiKeyHeader: String(
      config.apiKeyHeader ?? "X-API-Key",
    ),
    apiKeyValue: String(config.apiKeyValue ?? ""),
  };
}

function createHeaders(context: GatewayContext) {
  const configuration = getConfiguration(context);

  const headers = new Headers();

  for (const [name, value] of Object.entries(
    configuration.defaultHeaders,
  )) {
    headers.set(name, String(value));
  }

  if (
    configuration.authType === "bearer" &&
    configuration.token
  ) {
    headers.set(
      "Authorization",
      `Bearer ${configuration.token}`,
    );
  }

  if (
    configuration.authType === "basic" &&
    configuration.username
  ) {
    const credentials = Buffer.from(
      `${configuration.username}:${configuration.password}`,
    ).toString("base64");

    headers.set(
      "Authorization",
      `Basic ${credentials}`,
    );
  }

  if (
    configuration.authType === "api-key" &&
    configuration.apiKeyValue
  ) {
    headers.set(
      configuration.apiKeyHeader,
      configuration.apiKeyValue,
    );
  }

  return headers;
}

async function performHttpRequest(
  options: Record<string, unknown>,
  context: GatewayContext,
) {
  const configuration = getConfiguration(context);
  const path = String(options.path ?? "/");
  const method = String(
    options.method ?? "GET",
  ).toUpperCase();

  const url = new URL(path, configuration.baseUrl);

  const query = parseJsonObject(
    options.query,
    "Query string",
  );

  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, String(value));
  }

  const headers = createHeaders(context);

  const extraHeaders = parseJsonObject(
    options.headers,
    "Header richiesta",
  );

  for (const [name, value] of Object.entries(
    extraHeaders,
  )) {
    headers.set(name, String(value));
  }

  const contentType = String(
    options.contentType ?? "application/json",
  );

  const body = String(options.body ?? "");

  if (
    body &&
    !["GET", "HEAD"].includes(method)
  ) {
    headers.set("Content-Type", contentType);
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    configuration.timeout,
  );

  try {
    const response = await fetch(url, {
      method,
      headers,
      body:
        body && !["GET", "HEAD"].includes(method)
          ? body
          : undefined,
      signal: controller.signal,
    });

    const responseText = await response.text();

    context.setVariable(
      "http-websocket",
      "lastStatus",
      response.status,
    );

    context.setVariable(
      "http-websocket",
      "lastResponse",
      responseText.slice(0, 50000),
    );

    context.setVariable(
      "http-websocket",
      "lastSuccessful",
      response.ok,
    );

    context.setVariable(
      "http-websocket",
      "lastError",
      response.ok
        ? ""
        : `${response.status} ${response.statusText}`,
    );

    context.broadcast({
      type: "http-response",
      connectionId: context.connection?.id,
      url: url.toString(),
      status: response.status,
      ok: response.ok,
      body: responseText.slice(0, 50000),
    });

    return {
      url: url.toString(),
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      body: responseText.slice(0, 50000),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getWebSocket(
  context: GatewayContext,
) {
  const key = connectionKey(context);
  const configuration = getConfiguration(context);
  const existing = sockets.get(key);

  if (
    existing?.connected &&
    existing.url === configuration.websocketUrl
  ) {
    return existing;
  }

  if (!configuration.websocketUrl) {
    throw new Error(
      "Indirizzo WebSocket non configurato",
    );
  }

  if (existing) {
    existing.socket.close();
    sockets.delete(key);
  }

  const headers = Object.fromEntries(
    createHeaders(context).entries(),
  );

  const socket = new WebSocket(
    configuration.websocketUrl,
    { headers },
  );

  const cached: CachedWebSocket = {
    socket,
    url: configuration.websocketUrl,
    connected: false,
    messageCount: 0,
  };

  sockets.set(key, cached);

  socket.on("open", () => {
    cached.connected = true;

    context.setVariable(
      "http-websocket",
      "websocketConnected",
      true,
    );

    context.setVariable(
      "http-websocket",
      "lastError",
      "",
    );

    context.broadcast({
      type: "websocket-connected",
      connectionId: context.connection?.id,
      url: configuration.websocketUrl,
    });
  });

  socket.on("message", (data) => {
    const message = data.toString();

    cached.messageCount += 1;

    context.setVariable(
      "http-websocket",
      "lastMessage",
      message,
    );

    context.setVariable(
      "http-websocket",
      "messageCount",
      cached.messageCount,
    );

    context.broadcast({
      type: "websocket-message",
      connectionId: context.connection?.id,
      message,
    });
  });

  socket.on("close", () => {
    cached.connected = false;

    context.setVariable(
      "http-websocket",
      "websocketConnected",
      false,
    );
  });

  socket.on("error", (error) => {
    context.setVariable(
      "http-websocket",
      "lastError",
      error.message,
    );
  });

  await new Promise<void>((resolve, reject) => {
    const handleOpen = () => {
      socket.off("error", handleInitialError);
      resolve();
    };

    const handleInitialError = (error: Error) => {
      socket.off("open", handleOpen);
      reject(error);
    };

    socket.once("open", handleOpen);
    socket.once("error", handleInitialError);
  });

  return cached;
}

export const httpWebSocketPlugin: PluginDefinition = {
  id: "http-websocket",
  name: "HTTP / WebSocket",
  version: "1.0.0",
  description:
    "Integrazione universale con API HTTP e WebSocket.",

  configuration: [
    {
      id: "baseUrl",
      label: "URL HTTP di base",
      type: "text",
      required: true,
      defaultValue: "http://127.0.0.1:3000",
    },
    {
      id: "websocketUrl",
      label: "URL WebSocket",
      type: "text",
      defaultValue: "",
    },
    {
      id: "timeout",
      label: "Timeout millisecondi",
      type: "number",
      defaultValue: 10000,
    },
    {
      id: "defaultHeaders",
      label: "Header predefiniti JSON",
      type: "textarea",
      defaultValue: "{}",
    },
    {
      id: "authType",
      label: "Autenticazione",
      type: "select",
      defaultValue: "none",
      choices: [
        { id: "none", label: "Nessuna" },
        { id: "bearer", label: "Bearer token" },
        { id: "basic", label: "Basic Auth" },
        { id: "api-key", label: "API Key" },
      ],
    },
    {
      id: "username",
      label: "Username",
      type: "text",
    },
    {
      id: "password",
      label: "Password",
      type: "password",
    },
    {
      id: "token",
      label: "Bearer token",
      type: "password",
    },
    {
      id: "apiKeyHeader",
      label: "Nome header API Key",
      type: "text",
      defaultValue: "X-API-Key",
    },
    {
      id: "apiKeyValue",
      label: "Valore API Key",
      type: "password",
    },
  ],

  actions: [
    {
      id: "http-request",
      name: "Richiesta HTTP",
      fields: [
        {
          id: "method",
          label: "Metodo",
          type: "select",
          defaultValue: "GET",
          choices: [
            { id: "GET", label: "GET" },
            { id: "POST", label: "POST" },
            { id: "PUT", label: "PUT" },
            { id: "PATCH", label: "PATCH" },
            { id: "DELETE", label: "DELETE" },
          ],
        },
        {
          id: "path",
          label: "Percorso",
          type: "text",
          required: true,
          defaultValue: "/",
        },
        {
          id: "query",
          label: "Query JSON",
          type: "textarea",
          defaultValue: "{}",
        },
        {
          id: "headers",
          label: "Header aggiuntivi JSON",
          type: "textarea",
          defaultValue: "{}",
        },
        {
          id: "contentType",
          label: "Content-Type",
          type: "text",
          defaultValue: "application/json",
        },
        {
          id: "body",
          label: "Corpo richiesta",
          type: "textarea",
        },
      ],
    },
    {
      id: "start-polling",
      name: "Avvia polling HTTP",
      fields: [
        {
          id: "path",
          label: "Percorso",
          type: "text",
          required: true,
          defaultValue: "/",
        },
        {
          id: "interval",
          label: "Intervallo millisecondi",
          type: "number",
          defaultValue: 5000,
        },
        {
          id: "query",
          label: "Query JSON",
          type: "textarea",
          defaultValue: "{}",
        },
      ],
    },
    {
      id: "stop-polling",
      name: "Ferma polling HTTP",
      fields: [],
    },
    {
      id: "websocket-connect",
      name: "Connetti WebSocket",
      fields: [],
    },
    {
      id: "websocket-disconnect",
      name: "Disconnetti WebSocket",
      fields: [],
    },
    {
      id: "websocket-send-text",
      name: "Invia testo WebSocket",
      fields: [
        {
          id: "message",
          label: "Messaggio",
          type: "textarea",
          required: true,
        },
      ],
    },
    {
      id: "websocket-send-json",
      name: "Invia JSON WebSocket",
      fields: [
        {
          id: "message",
          label: "JSON",
          type: "textarea",
          required: true,
          defaultValue: "{}",
        },
      ],
    },
  ],

  feedbacks: [
    {
      id: "websocket-connected",
      name: "WebSocket connesso",
      fields: [],
    },
    {
      id: "last-http-successful",
      name: "Ultima richiesta HTTP riuscita",
      fields: [],
    },
    {
      id: "last-status",
      name: "Ultimo stato HTTP",
      fields: [
        {
          id: "status",
          label: "Stato atteso",
          type: "number",
        },
      ],
    },
    {
      id: "last-message",
      name: "Ultimo messaggio WebSocket",
      fields: [
        {
          id: "message",
          label: "Messaggio atteso",
          type: "text",
        },
      ],
    },
  ],

  variables: [
    {
      id: "websocketConnected",
      name: "WebSocket connesso",
      initialValue: false,
    },
    {
      id: "lastStatus",
      name: "Ultimo stato HTTP",
      initialValue: 0,
    },
    {
      id: "lastResponse",
      name: "Ultima risposta HTTP",
      initialValue: "",
    },
    {
      id: "lastSuccessful",
      name: "Ultima richiesta riuscita",
      initialValue: false,
    },
    {
      id: "lastMessage",
      name: "Ultimo messaggio WebSocket",
      initialValue: "",
    },
    {
      id: "messageCount",
      name: "Messaggi WebSocket ricevuti",
      initialValue: 0,
    },
    {
      id: "lastError",
      name: "Ultimo errore",
      initialValue: "",
    },
  ],

  presets: [
    {
      id: "get",
      name: "HTTP GET",
      category: "HTTP",
      actionId: "http-request",
      options: {
        method: "GET",
        path: "/",
        query: "{}",
      },
    },
    {
      id: "post-json",
      name: "HTTP POST JSON",
      category: "HTTP",
      actionId: "http-request",
      options: {
        method: "POST",
        path: "/",
        contentType: "application/json",
        body: "{}",
      },
    },
  ],

  async execute(actionId, options, context) {
    const key = connectionKey(context);

    try {
      if (actionId === "http-request") {
        return await performHttpRequest(
          options,
          context,
        );
      }

      if (actionId === "start-polling") {
        const existingTimer =
          pollingTimers.get(key);

        if (existingTimer) {
          clearInterval(existingTimer);
        }

        const interval = Math.max(
          500,
          Number(options.interval ?? 5000),
        );

        const requestOptions = {
          method: "GET",
          path: options.path ?? "/",
          query: options.query ?? "{}",
        };

        await performHttpRequest(
          requestOptions,
          context,
        );

        const timer = setInterval(() => {
          void performHttpRequest(
            requestOptions,
            context,
          ).catch((error) => {
            context.setVariable(
              "http-websocket",
              "lastError",
              error instanceof Error
                ? error.message
                : "Errore polling",
            );
          });
        }, interval);

        pollingTimers.set(key, timer);

        return { polling: true, interval };
      }

      if (actionId === "stop-polling") {
        const timer = pollingTimers.get(key);

        if (timer) {
          clearInterval(timer);
          pollingTimers.delete(key);
        }

        return { polling: false };
      }

      if (actionId === "websocket-disconnect") {
        const cached = sockets.get(key);

        if (cached) {
          cached.socket.close();
          sockets.delete(key);
        }

        context.setVariable(
          "http-websocket",
          "websocketConnected",
          false,
        );

        return { connected: false };
      }

      const cached = await getWebSocket(context);

      if (actionId === "websocket-connect") {
        return {
          connected: true,
          url: cached.url,
        };
      }

      if (
        actionId === "websocket-send-text" ||
        actionId === "websocket-send-json"
      ) {
        const message = String(
          options.message ?? "",
        );

        if (actionId === "websocket-send-json") {
          JSON.parse(message);
        }

        cached.socket.send(message);

        return {
          sent: true,
          message,
        };
      }

      throw new Error(
        `Azione HTTP/WebSocket sconosciuta: ${actionId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore HTTP/WebSocket sconosciuto";

      context.setVariable(
        "http-websocket",
        "lastError",
        message,
      );

      throw error;
    }
  },
};
