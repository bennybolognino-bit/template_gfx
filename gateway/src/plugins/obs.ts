import OBSWebSocket from "obs-websocket-js";

import type {
  GatewayContext,
  PluginDefinition,
} from "../types.js";

type CachedObsConnection = {
  client: OBSWebSocket;
  url: string;
  password: string;
  connected: boolean;
};

const clients = new Map<string, CachedObsConnection>();

function getConfiguration(context: GatewayContext) {
  const url = String(
    context.connection?.config.url ??
      "ws://127.0.0.1:4455",
  );

  const password = String(
    context.connection?.config.password ?? "",
  );

  const rpcVersion = Number(
    context.connection?.config.rpcVersion ?? 1,
  );

  if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
    throw new Error(
      "L'indirizzo OBS deve iniziare con ws:// o wss://",
    );
  }

  return { url, password, rpcVersion };
}

function connectionKey(context: GatewayContext) {
  return context.connection?.id ?? "obs-default";
}

async function getClient(context: GatewayContext) {
  const key = connectionKey(context);
  const configuration = getConfiguration(context);
  const existing = clients.get(key);

  if (
    existing?.connected &&
    existing.url === configuration.url &&
    existing.password === configuration.password
  ) {
    return existing.client;
  }

  if (existing) {
    try {
      await existing.client.disconnect();
    } catch {
      // La connessione precedente era già chiusa.
    }

    clients.delete(key);
  }

  const client = new OBSWebSocket();

  const cached: CachedObsConnection = {
    client,
    url: configuration.url,
    password: configuration.password,
    connected: false,
  };

  clients.set(key, cached);

  client.on("ConnectionClosed", () => {
    cached.connected = false;
    context.setVariable("obs", "connected", false);
  });

  client.on("CurrentProgramSceneChanged", (event) => {
    context.setVariable(
      "obs",
      "currentProgramScene",
      event.sceneName,
    );
  });

  client.on("CurrentPreviewSceneChanged", (event) => {
    context.setVariable(
      "obs",
      "currentPreviewScene",
      event.sceneName,
    );
  });

  client.on("RecordStateChanged", (event) => {
    context.setVariable(
      "obs",
      "recording",
      event.outputActive,
    );
  });

  client.on("StreamStateChanged", (event) => {
    context.setVariable(
      "obs",
      "streaming",
      event.outputActive,
    );
  });

  client.on("StudioModeStateChanged", (event) => {
    context.setVariable(
      "obs",
      "studioMode",
      event.studioModeEnabled,
    );
  });

  try {
    await client.connect(
      configuration.url,
      configuration.password || undefined,
      {
        rpcVersion: configuration.rpcVersion,
      },
    );

    cached.connected = true;

    context.setVariable("obs", "connected", true);
    context.setVariable("obs", "lastError", "");

    return client;
  } catch (error) {
    cached.connected = false;
    clients.delete(key);

    const message =
      error instanceof Error
        ? error.message
        : "Connessione OBS fallita";

    context.setVariable("obs", "connected", false);
    context.setVariable("obs", "lastError", message);

    throw error;
  }
}

async function updateObsStatus(
  client: OBSWebSocket,
  context: GatewayContext,
) {
  const [
    program,
    record,
    stream,
    studioMode,
  ] = await Promise.all([
    client.call("GetCurrentProgramScene"),
    client.call("GetRecordStatus"),
    client.call("GetStreamStatus"),
    client.call("GetStudioModeEnabled"),
  ]);

  context.setVariable(
    "obs",
    "currentProgramScene",
    program.currentProgramSceneName,
  );

  context.setVariable(
    "obs",
    "recording",
    record.outputActive,
  );

  context.setVariable(
    "obs",
    "streaming",
    stream.outputActive,
  );

  context.setVariable(
    "obs",
    "studioMode",
    studioMode.studioModeEnabled,
  );

  if (studioMode.studioModeEnabled) {
    try {
      const preview = await client.call(
        "GetCurrentPreviewScene",
      );

      context.setVariable(
        "obs",
        "currentPreviewScene",
        preview.currentPreviewSceneName,
      );
    } catch {
      context.setVariable(
        "obs",
        "currentPreviewScene",
        "",
      );
    }
  }

  return {
    programScene: program.currentProgramSceneName,
    recording: record.outputActive,
    streaming: stream.outputActive,
    studioMode: studioMode.studioModeEnabled,
  };
}

export const obsPlugin: PluginDefinition = {
  id: "obs",
  name: "OBS Studio",
  version: "1.0.0",
  description:
    "Controllo OBS Studio tramite OBS WebSocket 5.",

  configuration: [
    {
      id: "url",
      label: "Indirizzo WebSocket OBS",
      type: "text",
      required: true,
      defaultValue: "ws://127.0.0.1:4455",
    },
    {
      id: "password",
      label: "Password OBS WebSocket",
      type: "password",
    },
    {
      id: "rpcVersion",
      label: "Versione RPC",
      type: "number",
      defaultValue: 1,
    },
  ],

  actions: [
    {
      id: "connect",
      name: "Connetti e verifica",
      fields: [],
    },
    {
      id: "disconnect",
      name: "Disconnetti",
      fields: [],
    },
    {
      id: "get-status",
      name: "Aggiorna stato",
      fields: [],
    },
    {
      id: "program-scene",
      name: "Cambia scena Program",
      fields: [
        {
          id: "sceneName",
          label: "Nome scena",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "preview-scene",
      name: "Cambia scena Preview",
      fields: [
        {
          id: "sceneName",
          label: "Nome scena",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "trigger-transition",
      name: "Esegui transizione Studio",
      fields: [],
    },
    {
      id: "set-transition",
      name: "Imposta transizione",
      fields: [
        {
          id: "transitionName",
          label: "Nome transizione",
          type: "text",
          required: true,
        },
        {
          id: "duration",
          label: "Durata millisecondi",
          type: "number",
          defaultValue: 300,
        },
      ],
    },
    {
      id: "studio-mode",
      name: "Attiva/disattiva Studio Mode",
      fields: [
        {
          id: "enabled",
          label: "Attivo",
          type: "boolean",
          defaultValue: true,
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
      id: "toggle-recording",
      name: "Attiva/disattiva registrazione",
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
      id: "toggle-streaming",
      name: "Attiva/disattiva streaming",
      fields: [],
    },
    {
      id: "start-replay-buffer",
      name: "Avvia Replay Buffer",
      fields: [],
    },
    {
      id: "stop-replay-buffer",
      name: "Ferma Replay Buffer",
      fields: [],
    },
    {
      id: "save-replay-buffer",
      name: "Salva Replay Buffer",
      fields: [],
    },
    {
      id: "mute-input",
      name: "Muta sorgente audio",
      fields: [
        {
          id: "inputName",
          label: "Nome sorgente",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "unmute-input",
      name: "Riattiva sorgente audio",
      fields: [
        {
          id: "inputName",
          label: "Nome sorgente",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "toggle-mute",
      name: "Attiva/disattiva mute",
      fields: [
        {
          id: "inputName",
          label: "Nome sorgente",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "set-volume",
      name: "Imposta volume sorgente",
      fields: [
        {
          id: "inputName",
          label: "Nome sorgente",
          type: "text",
          required: true,
        },
        {
          id: "volume",
          label: "Volume 0-100",
          type: "number",
          defaultValue: 100,
        },
      ],
    },
    {
      id: "source-visible",
      name: "Mostra/nascondi sorgente",
      fields: [
        {
          id: "sceneName",
          label: "Nome scena",
          type: "text",
          required: true,
        },
        {
          id: "sourceName",
          label: "Nome sorgente",
          type: "text",
          required: true,
        },
        {
          id: "visible",
          label: "Visibile",
          type: "boolean",
          defaultValue: true,
        },
      ],
    },
    {
      id: "set-text",
      name: "Imposta testo sorgente",
      fields: [
        {
          id: "inputName",
          label: "Nome sorgente testo",
          type: "text",
          required: true,
        },
        {
          id: "text",
          label: "Testo",
          type: "textarea",
        },
      ],
    },
    {
      id: "custom-request",
      name: "Richiesta OBS personalizzata",
      fields: [
        {
          id: "requestType",
          label: "Tipo richiesta",
          type: "text",
          required: true,
        },
        {
          id: "requestData",
          label: "Dati JSON",
          type: "textarea",
          defaultValue: "{}",
        },
      ],
    },
  ],

  feedbacks: [
    {
      id: "connected",
      name: "OBS connesso",
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
      id: "studio-mode",
      name: "Studio Mode attivo",
      fields: [],
    },
    {
      id: "program-scene",
      name: "Scena Program attiva",
      fields: [
        {
          id: "sceneName",
          label: "Nome scena",
          type: "text",
        },
      ],
    },
  ],

  variables: [
    {
      id: "connected",
      name: "Connesso",
      initialValue: false,
    },
    {
      id: "currentProgramScene",
      name: "Scena Program",
      initialValue: "",
    },
    {
      id: "currentPreviewScene",
      name: "Scena Preview",
      initialValue: "",
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
      id: "studioMode",
      name: "Studio Mode",
      initialValue: false,
    },
    {
      id: "lastError",
      name: "Ultimo errore",
      initialValue: "",
    },
  ],

  presets: [
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
    {
      id: "transition",
      name: "Transizione",
      category: "Studio Mode",
      actionId: "trigger-transition",
      options: {},
    },
  ],

  async execute(actionId, options, context) {
    const key = connectionKey(context);

    if (actionId === "disconnect") {
      const cached = clients.get(key);

      if (cached) {
        await cached.client.disconnect();
        clients.delete(key);
      }

      context.setVariable("obs", "connected", false);

      return { connected: false };
    }

    const client = await getClient(context);

    try {
      switch (actionId) {
        case "connect":
          return await updateObsStatus(client, context);

        case "get-status":
          return await updateObsStatus(client, context);

        case "program-scene":
          return await client.call(
            "SetCurrentProgramScene",
            {
              sceneName: String(
                options.sceneName ?? "",
              ),
            },
          );

        case "preview-scene":
          return await client.call(
            "SetCurrentPreviewScene",
            {
              sceneName: String(
                options.sceneName ?? "",
              ),
            },
          );

        case "trigger-transition":
          return await client.call(
            "TriggerStudioModeTransition",
          );

        case "set-transition":
          await client.call(
            "SetCurrentSceneTransition",
            {
              transitionName: String(
                options.transitionName ?? "",
              ),
            },
          );

          return await client.call(
            "SetCurrentSceneTransitionDuration",
            {
              transitionDuration: Number(
                options.duration ?? 300,
              ),
            },
          );

        case "studio-mode":
          return await client.call(
            "SetStudioModeEnabled",
            {
              studioModeEnabled:
                Boolean(options.enabled),
            },
          );

        case "start-recording":
          return await client.call("StartRecord");

        case "stop-recording":
          return await client.call("StopRecord");

        case "toggle-recording":
          return await client.call("ToggleRecord");

        case "start-streaming":
          return await client.call("StartStream");

        case "stop-streaming":
          return await client.call("StopStream");

        case "toggle-streaming":
          return await client.call("ToggleStream");

        case "start-replay-buffer":
          return await client.call(
            "StartReplayBuffer",
          );

        case "stop-replay-buffer":
          return await client.call(
            "StopReplayBuffer",
          );

        case "save-replay-buffer":
          return await client.call(
            "SaveReplayBuffer",
          );

        case "mute-input":
          return await client.call("SetInputMute", {
            inputName: String(
              options.inputName ?? "",
            ),
            inputMuted: true,
          });

        case "unmute-input":
          return await client.call("SetInputMute", {
            inputName: String(
              options.inputName ?? "",
            ),
            inputMuted: false,
          });

        case "toggle-mute":
          return await client.call("ToggleInputMute", {
            inputName: String(
              options.inputName ?? "",
            ),
          });

        case "set-volume":
          return await client.call(
            "SetInputVolume",
            {
              inputName: String(
                options.inputName ?? "",
              ),
              inputVolumeMul: Math.max(
                0,
                Math.min(
                  1,
                  Number(options.volume ?? 100) / 100,
                ),
              ),
            },
          );

        case "source-visible": {
          const sceneName = String(
            options.sceneName ?? "",
          );

          const sourceName = String(
            options.sourceName ?? "",
          );

          const sceneItem = await client.call(
            "GetSceneItemId",
            {
              sceneName,
              sourceName,
            },
          );

          return await client.call(
            "SetSceneItemEnabled",
            {
              sceneName,
              sceneItemId: sceneItem.sceneItemId,
              sceneItemEnabled:
                Boolean(options.visible),
            },
          );
        }

        case "set-text":
          return await client.call(
            "SetInputSettings",
            {
              inputName: String(
                options.inputName ?? "",
              ),
              inputSettings: {
                text: String(options.text ?? ""),
              },
              overlay: true,
            },
          );

        case "custom-request": {
          const requestType = String(
            options.requestType ?? "",
          );

          const requestData = JSON.parse(
            String(options.requestData ?? "{}"),
          ) as Record<string, unknown>;

          return await (
            client.call as unknown as (
              request: string,
              data?: Record<string, unknown>,
            ) => Promise<unknown>
          )(requestType, requestData);
        }

        default:
          throw new Error(
            `Azione OBS sconosciuta: ${actionId}`,
          );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore OBS sconosciuto";

      context.setVariable("obs", "lastError", message);
      throw error;
    }
  },
};
