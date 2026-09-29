import {
  connect,
  type IClientOptions,
  type MqttClient,
} from "mqtt";

import type {
  GatewayContext,
  PluginDefinition,
} from "../types.js";

type CachedMqttConnection = {
  client: MqttClient;
  brokerUrl: string;
  connected: boolean;
  messageCount: number;
};

const clients = new Map<string, CachedMqttConnection>();

function connectionKey(context: GatewayContext) {
  return context.connection?.id ?? "mqtt-default";
}

function getConfiguration(context: GatewayContext) {
  const config = context.connection?.config ?? {};

  const brokerUrl = String(
    config.brokerUrl ?? "mqtt://127.0.0.1:1883",
  );

  if (
    !brokerUrl.startsWith("mqtt://") &&
    !brokerUrl.startsWith("mqtts://") &&
    !brokerUrl.startsWith("ws://") &&
    !brokerUrl.startsWith("wss://")
  ) {
    throw new Error(
      "Protocollo MQTT non valido",
    );
  }

  const options: IClientOptions = {
    clientId:
      String(config.clientId ?? "").trim() ||
      `template-gfx-${Math.random()
        .toString(16)
        .slice(2, 10)}`,

    username:
      String(config.username ?? "").trim() ||
      undefined,

    password:
      String(config.password ?? "") ||
      undefined,

    clean: Boolean(config.clean ?? true),

    keepalive: Math.max(
      5,
      Number(config.keepalive ?? 30),
    ),

    reconnectPeriod: 2000,

    rejectUnauthorized: Boolean(
      config.rejectUnauthorized ?? true,
    ),
  };

  return { brokerUrl, options };
}

function normalizeQos(value: unknown): 0 | 1 | 2 {
  const qos = Number(value ?? 0);

  if (qos === 1) return 1;
  if (qos === 2) return 2;

  return 0;
}

async function getClient(context: GatewayContext) {
  const key = connectionKey(context);
  const configuration = getConfiguration(context);
  const existing = clients.get(key);

  if (
    existing?.connected &&
    existing.brokerUrl === configuration.brokerUrl
  ) {
    return existing;
  }

  if (existing) {
    await new Promise<void>((resolve) => {
      existing.client.end(true, {}, () => resolve());
    });

    clients.delete(key);
  }

  const client = connect(
    configuration.brokerUrl,
    configuration.options,
  );

  const cached: CachedMqttConnection = {
    client,
    brokerUrl: configuration.brokerUrl,
    connected: false,
    messageCount: 0,
  };

  clients.set(key, cached);

  client.on("connect", () => {
    cached.connected = true;

    context.setVariable(
      "mqtt",
      "connected",
      true,
    );

    context.setVariable(
      "mqtt",
      "brokerUrl",
      configuration.brokerUrl,
    );

    context.setVariable(
      "mqtt",
      "lastError",
      "",
    );

    context.broadcast({
      type: "mqtt-connected",
      connectionId: context.connection?.id,
      brokerUrl: configuration.brokerUrl,
    });
  });

  client.on("reconnect", () => {
    context.setVariable(
      "mqtt",
      "connected",
      false,
    );
  });

  client.on("close", () => {
    cached.connected = false;

    context.setVariable(
      "mqtt",
      "connected",
      false,
    );
  });

  client.on("error", (error) => {
    context.setVariable(
      "mqtt",
      "lastError",
      error.message,
    );
  });

  client.on(
    "message",
    (topic, payload, packet) => {
      const message = payload.toString("utf8");

      cached.messageCount += 1;

      context.setVariable(
        "mqtt",
        "lastTopic",
        topic,
      );

      context.setVariable(
        "mqtt",
        "lastMessage",
        message,
      );

      context.setVariable(
        "mqtt",
        "lastRetained",
        packet.retain,
      );

      context.setVariable(
        "mqtt",
        "messageCount",
        cached.messageCount,
      );

      context.broadcast({
        type: "mqtt-message",
        connectionId: context.connection?.id,
        topic,
        message,
        qos: packet.qos,
        retain: packet.retain,
      });
    },
  );

  await new Promise<void>((resolve, reject) => {
    const handleConnect = () => {
      client.off("error", handleInitialError);
      resolve();
    };

    const handleInitialError = (error: Error) => {
      client.off("connect", handleConnect);
      reject(error);
    };

    client.once("connect", handleConnect);
    client.once("error", handleInitialError);
  });

  return cached;
}

async function publish(
  client: MqttClient,
  topic: string,
  payload: string,
  qos: 0 | 1 | 2,
  retain: boolean,
) {
  if (!topic.trim()) {
    throw new Error("Topic MQTT obbligatorio");
  }

  await new Promise<void>((resolve, reject) => {
    client.publish(
      topic,
      payload,
      { qos, retain },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });

  return { topic, payload, qos, retain };
}

export const mqttPlugin: PluginDefinition = {
  id: "mqtt",
  name: "MQTT",
  version: "1.0.0",
  description:
    "Pubblicazione e sottoscrizione MQTT con feedback in tempo reale.",

  configuration: [
    {
      id: "brokerUrl",
      label: "Indirizzo broker",
      type: "text",
      required: true,
      defaultValue: "mqtt://127.0.0.1:1883",
    },
    {
      id: "clientId",
      label: "Client ID",
      type: "text",
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
      id: "clean",
      label: "Sessione pulita",
      type: "boolean",
      defaultValue: true,
    },
    {
      id: "keepalive",
      label: "Keepalive secondi",
      type: "number",
      defaultValue: 30,
    },
    {
      id: "rejectUnauthorized",
      label: "Verifica certificato TLS",
      type: "boolean",
      defaultValue: true,
    },
  ],

  actions: [
    {
      id: "connect",
      name: "Connetti al broker",
      fields: [],
    },
    {
      id: "disconnect",
      name: "Disconnetti dal broker",
      fields: [],
    },
    {
      id: "publish",
      name: "Pubblica messaggio",
      fields: [
        {
          id: "topic",
          label: "Topic",
          type: "text",
          required: true,
        },
        {
          id: "payload",
          label: "Messaggio",
          type: "textarea",
        },
        {
          id: "qos",
          label: "QoS",
          type: "select",
          defaultValue: "0",
          choices: [
            { id: "0", label: "QoS 0" },
            { id: "1", label: "QoS 1" },
            { id: "2", label: "QoS 2" },
          ],
        },
        {
          id: "retain",
          label: "Messaggio retained",
          type: "boolean",
          defaultValue: false,
        },
      ],
    },
    {
      id: "publish-json",
      name: "Pubblica JSON",
      fields: [
        {
          id: "topic",
          label: "Topic",
          type: "text",
          required: true,
        },
        {
          id: "payload",
          label: "JSON",
          type: "textarea",
          defaultValue: "{}",
        },
        {
          id: "qos",
          label: "QoS",
          type: "select",
          defaultValue: "0",
          choices: [
            { id: "0", label: "QoS 0" },
            { id: "1", label: "QoS 1" },
            { id: "2", label: "QoS 2" },
          ],
        },
        {
          id: "retain",
          label: "Messaggio retained",
          type: "boolean",
          defaultValue: false,
        },
      ],
    },
    {
      id: "subscribe",
      name: "Sottoscrivi topic",
      fields: [
        {
          id: "topic",
          label: "Topic o wildcard",
          type: "text",
          required: true,
          defaultValue: "#",
        },
        {
          id: "qos",
          label: "QoS",
          type: "select",
          defaultValue: "0",
          choices: [
            { id: "0", label: "QoS 0" },
            { id: "1", label: "QoS 1" },
            { id: "2", label: "QoS 2" },
          ],
        },
      ],
    },
    {
      id: "unsubscribe",
      name: "Annulla sottoscrizione",
      fields: [
        {
          id: "topic",
          label: "Topic o wildcard",
          type: "text",
          required: true,
        },
      ],
    },
    {
      id: "clear-retained",
      name: "Cancella messaggio retained",
      fields: [
        {
          id: "topic",
          label: "Topic",
          type: "text",
          required: true,
        },
      ],
    },
  ],

  feedbacks: [
    {
      id: "connected",
      name: "Broker connesso",
      fields: [],
    },
    {
      id: "last-topic",
      name: "Ultimo topic ricevuto",
      fields: [
        {
          id: "topic",
          label: "Topic atteso",
          type: "text",
        },
      ],
    },
    {
      id: "last-message",
      name: "Ultimo messaggio ricevuto",
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
      id: "connected",
      name: "Broker connesso",
      initialValue: false,
    },
    {
      id: "brokerUrl",
      name: "Indirizzo broker",
      initialValue: "",
    },
    {
      id: "lastTopic",
      name: "Ultimo topic",
      initialValue: "",
    },
    {
      id: "lastMessage",
      name: "Ultimo messaggio",
      initialValue: "",
    },
    {
      id: "lastRetained",
      name: "Ultimo messaggio retained",
      initialValue: false,
    },
    {
      id: "messageCount",
      name: "Messaggi ricevuti",
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
      id: "publish-on",
      name: "Pubblica ON",
      category: "MQTT",
      actionId: "publish",
      options: {
        topic: "template-gfx/button",
        payload: "ON",
        qos: "0",
        retain: false,
      },
    },
    {
      id: "publish-off",
      name: "Pubblica OFF",
      category: "MQTT",
      actionId: "publish",
      options: {
        topic: "template-gfx/button",
        payload: "OFF",
        qos: "0",
        retain: false,
      },
    },
  ],

  async execute(actionId, options, context) {
    const key = connectionKey(context);

    if (actionId === "disconnect") {
      const cached = clients.get(key);

      if (cached) {
        await new Promise<void>((resolve) => {
          cached.client.end(false, {}, () =>
            resolve(),
          );
        });

        clients.delete(key);
      }

      context.setVariable(
        "mqtt",
        "connected",
        false,
      );

      return { connected: false };
    }

    try {
      const cached = await getClient(context);
      const client = cached.client;

      if (actionId === "connect") {
        return {
          connected: true,
          brokerUrl: cached.brokerUrl,
        };
      }

      if (
        actionId === "publish" ||
        actionId === "publish-json"
      ) {
        const payload = String(
          options.payload ?? "",
        );

        if (actionId === "publish-json") {
          JSON.parse(payload);
        }

        return await publish(
          client,
          String(options.topic ?? ""),
          payload,
          normalizeQos(options.qos),
          Boolean(options.retain),
        );
      }

      if (actionId === "subscribe") {
        const topic = String(options.topic ?? "");

        if (!topic) {
          throw new Error(
            "Topic MQTT obbligatorio",
          );
        }

        await new Promise<void>((resolve, reject) => {
          client.subscribe(
            topic,
            {
              qos: normalizeQos(options.qos),
            },
            (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            },
          );
        });

        return { subscribed: topic };
      }

      if (actionId === "unsubscribe") {
        const topic = String(options.topic ?? "");

        await new Promise<void>((resolve, reject) => {
          client.unsubscribe(topic, (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });

        return { unsubscribed: topic };
      }

      if (actionId === "clear-retained") {
        return await publish(
          client,
          String(options.topic ?? ""),
          "",
          1,
          true,
        );
      }

      throw new Error(
        `Azione MQTT sconosciuta: ${actionId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore MQTT sconosciuto";

      context.setVariable(
        "mqtt",
        "lastError",
        message,
      );

      throw error;
    }
  },
};
