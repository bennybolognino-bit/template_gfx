import type { PluginDefinition } from "../types.js";

export const corePlugin: PluginDefinition = {
  id: "template-gfx-core",
  name: "Template GFX Core",
  version: "1.0.0",
  description:
    "Plugin dimostrativo con richieste HTTP, variabili e messaggi WebSocket.",

  configuration: [],

  actions: [
    {
      id: "http-request",
      name: "Richiesta HTTP",
      description: "Esegue una richiesta HTTP verso un servizio esterno.",
      fields: [
        {
          id: "url",
          label: "URL",
          type: "text",
          required: true,
        },
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
            { id: "DELETE", label: "DELETE" }
          ],
        },
        {
          id: "body",
          label: "Corpo JSON",
          type: "textarea",
        }
      ],
    },
    {
      id: "set-variable",
      name: "Imposta variabile",
      fields: [
        {
          id: "name",
          label: "Nome variabile",
          type: "text",
          required: true,
        },
        {
          id: "value",
          label: "Valore",
          type: "text",
        }
      ],
    },
    {
      id: "broadcast-message",
      name: "Invia messaggio WebSocket",
      fields: [
        {
          id: "message",
          label: "Messaggio",
          type: "textarea",
          required: true,
        }
      ],
    },
    {
      id: "wait",
      name: "Attendi",
      fields: [
        {
          id: "milliseconds",
          label: "Millisecondi",
          type: "number",
          defaultValue: 1000,
        }
      ],
    }
  ],

  feedbacks: [
    {
      id: "variable-equals",
      name: "Variabile uguale a",
      fields: [
        {
          id: "name",
          label: "Nome variabile",
          type: "text",
          required: true,
        },
        {
          id: "value",
          label: "Valore atteso",
          type: "text",
          required: true,
        }
      ],
    }
  ],

  variables: [
    {
      id: "lastAction",
      name: "Ultima azione eseguita",
      initialValue: "",
    },
    {
      id: "lastStatus",
      name: "Ultimo stato HTTP",
      initialValue: 0,
    }
  ],

  presets: [
    {
      id: "example-get",
      name: "HTTP GET",
      category: "Rete",
      actionId: "http-request",
      options: {
        url: "https://example.com",
        method: "GET"
      },
    }
  ],

  async execute(actionId, options, context) {
    context.setVariable(
      "template-gfx-core",
      "lastAction",
      actionId,
    );

    if (actionId === "http-request") {
      const url = String(options.url ?? "");
      const method = String(options.method ?? "GET").toUpperCase();
      const body = String(options.body ?? "");

      if (!url) {
        throw new Error("URL obbligatorio");
      }

      const response = await fetch(url, {
        method,
        headers:
          method === "GET"
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          method === "GET" || method === "DELETE"
            ? undefined
            : body || undefined,
      });

      const responseText = await response.text();

      context.setVariable(
        "template-gfx-core",
        "lastStatus",
        response.status,
      );

      return {
        ok: response.ok,
        status: response.status,
        body: responseText.slice(0, 10000),
      };
    }

    if (actionId === "set-variable") {
      const name = String(options.name ?? "");
      const value = options.value ?? "";

      if (!name) {
        throw new Error("Nome variabile obbligatorio");
      }

      context.setVariable(
        "template-gfx-core",
        name,
        value,
      );

      return { name, value };
    }

    if (actionId === "broadcast-message") {
      const message = String(options.message ?? "");

      context.broadcast({
        type: "plugin-message",
        pluginId: "template-gfx-core",
        message,
      });

      return { sent: true };
    }

    if (actionId === "wait") {
      const milliseconds = Math.max(
        0,
        Number(options.milliseconds ?? 1000),
      );

      await new Promise((resolve) =>
        setTimeout(resolve, milliseconds),
      );

      return { waited: milliseconds };
    }

    throw new Error(`Azione sconosciuta: ${actionId}`);
  },
};
