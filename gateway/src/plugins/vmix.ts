import type {
  GatewayContext,
  PluginDefinition,
} from "../types.js";

let configuredBaseUrl =
  process.env.VMIX_URL ?? "http://127.0.0.1:8088";

function normalizeBaseUrl(value: unknown) {
  const url = new URL(
    String(value || configuredBaseUrl),
  );

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Sono consentiti solo URL HTTP o HTTPS");
  }

  return url.toString().replace(/\/$/, "");
}

async function callVmix(
  functionName: string,
  parameters: Record<string, unknown>,
  context: GatewayContext,
) {
  const query = new URLSearchParams({
    Function: functionName,
  });

  for (const [name, value] of Object.entries(parameters)) {
    if (
      value !== undefined &&
      value !== null &&
      String(value) !== ""
    ) {
      query.set(name, String(value));
    }
  }

  const response = await fetch(
    `${configuredBaseUrl}/api?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `vMix HTTP ${response.status}: ${response.statusText}`,
    );
  }

  context.setVariable("vmix", "connected", true);
  context.setVariable(
    "vmix",
    "lastFunction",
    functionName,
  );
  context.setVariable("vmix", "lastError", "");

  return {
    ok: true,
    function: functionName,
    status: response.status,
    body: (await response.text()).slice(0, 10000),
  };
}

function readXmlValue(xml: string, tag: string) {
  const expression = new RegExp(
    `<${tag}>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );

  return expression.exec(xml)?.[1]?.trim() ?? "";
}

export const vmixPlugin: PluginDefinition = {
  id: "vmix",
  name: "vMix",
  version: "1.0.0",
  description:
    "Controllo vMix e VMixClone tramite API HTTP.",

  configuration: [
    {
      id: "baseUrl",
      label: "Indirizzo vMix",
      type: "text",
      required: true,
      defaultValue: "http://127.0.0.1:8088",
    },
  ],

  actions: [
    {
      id: "configure",
      name: "Configura e verifica connessione",
      fields: [
        {
          id: "baseUrl",
          label: "Indirizzo vMix",
          type: "text",
          required: true,
          defaultValue: "http://127.0.0.1:8088",
        },
      ],
    },
    {
      id: "cut",
      name: "CUT",
      fields: [
        {
          id: "input",
          label: "Input opzionale",
          type: "text",
        },
      ],
    },
    {
      id: "fade",
      name: "FADE",
      fields: [
        {
          id: "input",
          label: "Input",
          type: "text",
        },
        {
          id: "duration",
          label: "Durata millisecondi",
          type: "number",
          defaultValue: 500,
        },
      ],
    },
    {
      id: "preview-input",
      name: "Imposta Preview",
      fields: [
        {
          id: "input",
          label: "Numero, chiave o nome input",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "active-input",
      name: "Imposta Program",
      fields: [
        {
          id: "input",
          label: "Numero, chiave o nome input",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "start-recording",
      name: "Avvia registrazione",
      fields: [],
    },
    {
      id: "stop-recording",
      name: "Ferma registrazione",
      fields: [],
    },
    {
      id: "start-streaming",
      name: "Avvia streaming",
      fields: [],
    },
    {
      id: "stop-streaming",
      name: "Ferma streaming",
      fields: [],
    },
    {
      id: "overlay-in",
      name: "Overlay IN",
      fields: [
        {
          id: "overlay",
          label: "Numero overlay",
          type: "select",
          defaultValue: "1",
          choices: [
            { id: "1", label: "Overlay 1" },
            { id: "2", label: "Overlay 2" },
            { id: "3", label: "Overlay 3" },
            { id: "4", label: "Overlay 4" },
          ],
        },
        {
          id: "input",
          label: "Input",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "overlay-out",
      name: "Overlay OUT",
      fields: [
        {
          id: "overlay",
          label: "Numero overlay",
          type: "select",
          defaultValue: "1",
          choices: [
            { id: "1", label: "Overlay 1" },
            { id: "2", label: "Overlay 2" },
            { id: "3", label: "Overlay 3" },
            { id: "4", label: "Overlay 4" },
          ],
        },
      ],
    },
    {
      id: "audio-on",
      name: "Audio ON",
      fields: [
        {
          id: "input",
          label: "Input",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "audio-off",
      name: "Audio OFF",
      fields: [
        {
          id: "input",
          label: "Input",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "set-volume",
      name: "Imposta volume",
      fields: [
        {
          id: "input",
          label: "Input",
          type: "text",
          required: true,
        },
        {
          id: "value",
          label: "Volume 0-100",
          type: "number",
          defaultValue: 100,
        },
      ],
    },
    {
      id: "set-text",
      name: "Imposta testo titolo",
      fields: [
        {
          id: "input",
          label: "Input titolo",
          type: "text",
          required: true,
        },
        {
          id: "selectedName",
          label: "Nome campo testo",
          type: "text",
          required: true,
        },
        {
          id: "value",
          label: "Testo",
          type: "textarea",
        },
      ],
    },
    {
      id: "get-state",
      name: "Aggiorna stato vMix",
      fields: [],
    },
    {
      id: "custom-function",
      name: "Funzione vMix personalizzata",
      fields: [
        {
          id: "function",
          label: "Nome funzione",
          type: "text",
          required: true,
        },
        {
          id: "input",
          label: "Input",
          type: "text",
        },
        {
          id: "value",
          label: "Valore",
          type: "text",
        },
        {
          id: "duration",
          label: "Durata",
          type: "number",
        },
      ],
    },
  ],

  feedbacks: [
    {
      id: "connected",
      name: "vMix connesso",
      fields: [],
    },
    {
      id: "recording",
      name: "Registrazione attiva",
      fields: [],
    },
    {
      id: "streaming",
      name: "Streaming attivo",
      fields: [],
    },
    {
      id: "active-input",
      name: "Input in Program",
      fields: [
        {
          id: "input",
          label: "Input atteso",
          type: "text",
        },
      ],
    },
    {
      id: "preview-input",
      name: "Input in Preview",
      fields: [
        {
          id: "input",
          label: "Input atteso",
          type: "text",
        },
      ],
    },
  ],

  variables: [
    {
      id: "baseUrl",
      name: "Indirizzo vMix",
      initialValue: configuredBaseUrl,
    },
    {
      id: "connected",
      name: "Connesso",
      initialValue: false,
    },
    {
      id: "recording",
      name: "Registrazione",
      initialValue: false,
    },
    {
      id: "streaming",
      name: "Streaming",
      initialValue: false,
    },
    {
      id: "activeInput",
      name: "Input Program",
      initialValue: "",
    },
    {
      id: "previewInput",
      name: "Input Preview",
      initialValue: "",
    },
    {
      id: "lastFunction",
      name: "Ultima funzione",
      initialValue: "",
    },
    {
      id: "lastError",
      name: "Ultimo errore",
      initialValue: "",
    },
  ],

  presets: [
    {
      id: "cut",
      name: "CUT",
      category: "Transizioni",
      actionId: "cut",
      options: {},
    },
    {
      id: "record",
      name: "Avvia registrazione",
      category: "Registrazione",
      actionId: "start-recording",
      options: {},
    },
    {
      id: "stream",
      name: "Avvia streaming",
      category: "Streaming",
      actionId: "start-streaming",
      options: {},
    },
  ],

  async execute(actionId, options, context) {
    try {
      if (actionId === "configure") {
        configuredBaseUrl = normalizeBaseUrl(
          options.baseUrl,
        );

        let response = await fetch(
          `${configuredBaseUrl}/api`,
        );

        if (!response.ok) {
          response = await fetch(
            `${configuredBaseUrl}/api/sources`,
          );
        }

        if (!response.ok) {
          throw new Error(
            `Connessione fallita: HTTP ${response.status}`,
          );
        }

        context.setVariable(
          "vmix",
          "baseUrl",
          configuredBaseUrl,
        );
        context.setVariable("vmix", "connected", true);
        context.setVariable("vmix", "lastError", "");

        return {
          connected: true,
          baseUrl: configuredBaseUrl,
        };
      }

      if (actionId === "get-state") {
        const response = await fetch(
          `${configuredBaseUrl}/api`,
        );

        if (!response.ok) {
          throw new Error(
            `Stato vMix non disponibile: HTTP ${response.status}`,
          );
        }

        const xml = await response.text();
        const recording =
          readXmlValue(xml, "recording").toLowerCase() ===
          "true";
        const streaming =
          readXmlValue(xml, "streaming").toLowerCase() ===
          "true";
        const activeInput = readXmlValue(xml, "active");
        const previewInput = readXmlValue(xml, "preview");

        context.setVariable("vmix", "connected", true);
        context.setVariable(
          "vmix",
          "recording",
          recording,
        );
        context.setVariable(
          "vmix",
          "streaming",
          streaming,
        );
        context.setVariable(
          "vmix",
          "activeInput",
          activeInput,
        );
        context.setVariable(
          "vmix",
          "previewInput",
          previewInput,
        );

        return {
          recording,
          streaming,
          activeInput,
          previewInput,
        };
      }

      let functionName = "";
      const parameters: Record<string, unknown> = {};

      switch (actionId) {
        case "cut":
          functionName = "Cut";
          parameters.Input = options.input;
          break;

        case "fade":
          functionName = "Fade";
          parameters.Input = options.input;
          parameters.Duration = options.duration ?? 500;
          break;

        case "preview-input":
          functionName = "PreviewInput";
          parameters.Input = options.input;
          break;

        case "active-input":
          functionName = "ActiveInput";
          parameters.Input = options.input;
          break;

        case "start-recording":
          functionName = "StartRecording";
          break;

        case "stop-recording":
          functionName = "StopRecording";
          break;

        case "start-streaming":
          functionName = "StartStreaming";
          break;

        case "stop-streaming":
          functionName = "StopStreaming";
          break;

        case "overlay-in":
          functionName =
            `OverlayInput${options.overlay ?? 1}In`;
          parameters.Input = options.input;
          break;

        case "overlay-out":
          functionName =
            `OverlayInput${options.overlay ?? 1}Out`;
          break;

        case "audio-on":
          functionName = "AudioOn";
          parameters.Input = options.input;
          break;

        case "audio-off":
          functionName = "AudioOff";
          parameters.Input = options.input;
          break;

        case "set-volume":
          functionName = "SetVolume";
          parameters.Input = options.input;
          parameters.Value = options.value;
          break;

        case "set-text":
          functionName = "SetText";
          parameters.Input = options.input;
          parameters.SelectedName =
            options.selectedName;
          parameters.Value = options.value;
          break;

        case "custom-function":
          functionName = String(options.function ?? "");
          parameters.Input = options.input;
          parameters.Value = options.value;
          parameters.Duration = options.duration;
          break;

        default:
          throw new Error(
            `Azione vMix sconosciuta: ${actionId}`,
          );
      }

      if (!functionName) {
        throw new Error("Funzione vMix obbligatoria");
      }

      const result = await callVmix(
        functionName,
        parameters,
        context,
      );

      if (actionId === "start-recording") {
        context.setVariable("vmix", "recording", true);
      }

      if (actionId === "stop-recording") {
        context.setVariable("vmix", "recording", false);
      }

      if (actionId === "start-streaming") {
        context.setVariable("vmix", "streaming", true);
      }

      if (actionId === "stop-streaming") {
        context.setVariable("vmix", "streaming", false);
      }

      if (actionId === "active-input") {
        context.setVariable(
          "vmix",
          "activeInput",
          String(options.input ?? ""),
        );
      }

      if (actionId === "preview-input") {
        context.setVariable(
          "vmix",
          "previewInput",
          String(options.input ?? ""),
        );
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore vMix sconosciuto";

      context.setVariable("vmix", "connected", false);
      context.setVariable("vmix", "lastError", message);

      throw error;
    }
  },
};
