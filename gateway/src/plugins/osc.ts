import dgram from "node:dgram";

import type {
  GatewayContext,
  PluginDefinition,
} from "../types.js";

type OscArgument = {
  type: "i" | "f" | "s" | "T" | "F" | "N";
  value?: unknown;
};

type OscConnection = {
  socket: dgram.Socket;
  remoteHost: string;
  remotePort: number;
  localHost: string;
  localPort: number;
  connected: boolean;
  receivedCount: number;
};

const connections = new Map<string, OscConnection>();

function padLength(length: number) {
  return (4 - (length % 4)) % 4;
}

function encodeOscString(value: string) {
  const content = Buffer.from(`${value}\0`, "utf8");
  const padding = Buffer.alloc(padLength(content.length));

  return Buffer.concat([content, padding]);
}

function encodeArgument(argument: OscArgument) {
  if (argument.type === "i") {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32BE(Number(argument.value ?? 0));
    return buffer;
  }

  if (argument.type === "f") {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(Number(argument.value ?? 0));
    return buffer;
  }

  if (argument.type === "s") {
    return encodeOscString(String(argument.value ?? ""));
  }

  return Buffer.alloc(0);
}

function encodeOscMessage(
  address: string,
  argumentsList: OscArgument[],
) {
  if (!address.startsWith("/")) {
    throw new Error(
      "L'indirizzo OSC deve iniziare con /",
    );
  }

  const typeTags =
    "," +
    argumentsList
      .map((argument) => argument.type)
      .join("");

  return Buffer.concat([
    encodeOscString(address),
    encodeOscString(typeTags),
    ...argumentsList.map(encodeArgument),
  ]);
}

function readOscString(
  buffer: Buffer,
  initialOffset: number,
) {
  let end = initialOffset;

  while (end < buffer.length && buffer[end] !== 0) {
    end += 1;
  }

  const value = buffer
    .subarray(initialOffset, end)
    .toString("utf8");

  const consumed = end - initialOffset + 1;
  const nextOffset =
    initialOffset +
    consumed +
    padLength(consumed);

  return { value, nextOffset };
}

function decodeOscMessage(buffer: Buffer) {
  const addressResult = readOscString(buffer, 0);

  if (addressResult.value === "#bundle") {
    return {
      address: "#bundle",
      arguments: [] as unknown[],
    };
  }

  const typeResult = readOscString(
    buffer,
    addressResult.nextOffset,
  );

  const typeTags = typeResult.value.startsWith(",")
    ? typeResult.value.slice(1)
    : "";

  let offset = typeResult.nextOffset;
  const argumentsList: unknown[] = [];

  for (const type of typeTags) {
    if (type === "i" && offset + 4 <= buffer.length) {
      argumentsList.push(buffer.readInt32BE(offset));
      offset += 4;
      continue;
    }

    if (type === "f" && offset + 4 <= buffer.length) {
      argumentsList.push(buffer.readFloatBE(offset));
      offset += 4;
      continue;
    }

    if (type === "s") {
      const stringResult = readOscString(
        buffer,
        offset,
      );

      argumentsList.push(stringResult.value);
      offset = stringResult.nextOffset;
      continue;
    }

    if (type === "T") {
      argumentsList.push(true);
      continue;
    }

    if (type === "F") {
      argumentsList.push(false);
      continue;
    }

    if (type === "N") {
      argumentsList.push(null);
    }
  }

  return {
    address: addressResult.value,
    arguments: argumentsList,
  };
}

function connectionKey(context: GatewayContext) {
  return context.connection?.id ?? "osc-default";
}

function readConfiguration(context: GatewayContext) {
  const remoteHost = String(
    context.connection?.config.remoteHost ??
      "127.0.0.1",
  );

  const remotePort = Number(
    context.connection?.config.remotePort ?? 8000,
  );

  const localHost = String(
    context.connection?.config.localHost ??
      "0.0.0.0",
  );

  const localPort = Number(
    context.connection?.config.localPort ?? 9000,
  );

  if (
    !Number.isInteger(remotePort) ||
    remotePort < 1 ||
    remotePort > 65535
  ) {
    throw new Error("Porta OSC remota non valida");
  }

  if (
    !Number.isInteger(localPort) ||
    localPort < 0 ||
    localPort > 65535
  ) {
    throw new Error("Porta OSC locale non valida");
  }

  return {
    remoteHost,
    remotePort,
    localHost,
    localPort,
  };
}

async function openConnection(
  context: GatewayContext,
) {
  const key = connectionKey(context);
  const configuration = readConfiguration(context);
  const existing = connections.get(key);

  if (
    existing?.connected &&
    existing.remoteHost ===
      configuration.remoteHost &&
    existing.remotePort ===
      configuration.remotePort &&
    existing.localHost ===
      configuration.localHost &&
    existing.localPort ===
      configuration.localPort
  ) {
    return existing;
  }

  if (existing) {
    existing.socket.close();
    connections.delete(key);
  }

  const socket = dgram.createSocket("udp4");

  const connection: OscConnection = {
    socket,
    ...configuration,
    connected: false,
    receivedCount: 0,
  };

  socket.on("message", (message, remoteInfo) => {
    try {
      const decoded = decodeOscMessage(message);

      connection.receivedCount += 1;

      context.setVariable(
        "osc",
        "lastAddress",
        decoded.address,
      );

      context.setVariable(
        "osc",
        "lastValue",
        decoded.arguments[0] ?? "",
      );

      context.setVariable(
        "osc",
        "lastArguments",
        JSON.stringify(decoded.arguments),
      );

      context.setVariable(
        "osc",
        "lastRemote",
        `${remoteInfo.address}:${remoteInfo.port}`,
      );

      context.setVariable(
        "osc",
        "receivedCount",
        connection.receivedCount,
      );

      context.broadcast({
        type: "osc-message",
        connectionId: context.connection?.id,
        address: decoded.address,
        arguments: decoded.arguments,
        remoteAddress: remoteInfo.address,
        remotePort: remoteInfo.port,
      });
    } catch (error) {
      context.setVariable(
        "osc",
        "lastError",
        error instanceof Error
          ? error.message
          : "Messaggio OSC non valido",
      );
    }
  });

  socket.on("error", (error) => {
    connection.connected = false;

    context.setVariable(
      "osc",
      "connected",
      false,
    );

    context.setVariable(
      "osc",
      "lastError",
      error.message,
    );
  });

  await new Promise<void>((resolve, reject) => {
    const handleInitialError = (error: Error) => {
      socket.off("listening", handleListening);
      reject(error);
    };

    const handleListening = () => {
      socket.off("error", handleInitialError);
      resolve();
    };

    socket.once("error", handleInitialError);
    socket.once("listening", handleListening);

    socket.bind(
      configuration.localPort,
      configuration.localHost,
    );
  });

  connection.connected = true;
  connections.set(key, connection);

  const address = socket.address();

  context.setVariable("osc", "connected", true);
  context.setVariable(
    "osc",
    "localPort",
    typeof address === "string"
      ? configuration.localPort
      : address.port,
  );
  context.setVariable(
    "osc",
    "remoteTarget",
    `${configuration.remoteHost}:${configuration.remotePort}`,
  );
  context.setVariable("osc", "lastError", "");

  return connection;
}

async function sendMessage(
  connection: OscConnection,
  address: string,
  argumentsList: OscArgument[],
) {
  const packet = encodeOscMessage(
    address,
    argumentsList,
  );

  await new Promise<void>((resolve, reject) => {
    connection.socket.send(
      packet,
      connection.remotePort,
      connection.remoteHost,
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });

  return {
    address,
    arguments: argumentsList,
    remoteHost: connection.remoteHost,
    remotePort: connection.remotePort,
  };
}

function parseTypedArgument(
  type: string,
  value: unknown,
): OscArgument {
  if (type === "integer") {
    return { type: "i", value: Number(value ?? 0) };
  }

  if (type === "float") {
    return { type: "f", value: Number(value ?? 0) };
  }

  if (type === "true") {
    return { type: "T" };
  }

  if (type === "false") {
    return { type: "F" };
  }

  if (type === "null") {
    return { type: "N" };
  }

  return { type: "s", value: String(value ?? "") };
}

export const oscPlugin: PluginDefinition = {
  id: "osc",
  name: "OSC",
  version: "1.0.0",
  description:
    "Invio e ricezione Open Sound Control tramite UDP.",

  configuration: [
    {
      id: "remoteHost",
      label: "IP o hostname destinazione",
      type: "text",
      required: true,
      defaultValue: "127.0.0.1",
    },
    {
      id: "remotePort",
      label: "Porta UDP destinazione",
      type: "number",
      required: true,
      defaultValue: 8000,
    },
    {
      id: "localHost",
      label: "Interfaccia locale",
      type: "text",
      required: true,
      defaultValue: "0.0.0.0",
    },
    {
      id: "localPort",
      label: "Porta UDP di ascolto",
      type: "number",
      required: true,
      defaultValue: 9000,
    },
  ],

  actions: [
    {
      id: "open",
      name: "Apri connessione OSC",
      fields: [],
    },
    {
      id: "close",
      name: "Chiudi connessione OSC",
      fields: [],
    },
    {
      id: "send-trigger",
      name: "Invia trigger senza valore",
      fields: [
        {
          id: "address",
          label: "Indirizzo OSC",
          type: "text",
          required: true,
          defaultValue: "/trigger",
        },
      ],
    },
    {
      id: "send-value",
      name: "Invia valore",
      fields: [
        {
          id: "address",
          label: "Indirizzo OSC",
          type: "text",
          required: true,
          defaultValue: "/value",
        },
        {
          id: "type",
          label: "Tipo valore",
          type: "select",
          defaultValue: "float",
          choices: [
            { id: "integer", label: "Intero" },
            { id: "float", label: "Decimale" },
            { id: "string", label: "Testo" },
            { id: "true", label: "Booleano vero" },
            { id: "false", label: "Booleano falso" },
            { id: "null", label: "Null" },
          ],
        },
        {
          id: "value",
          label: "Valore",
          type: "text",
        },
      ],
    },
    {
      id: "send-json",
      name: "Invia argomenti JSON",
      fields: [
        {
          id: "address",
          label: "Indirizzo OSC",
          type: "text",
          required: true,
          defaultValue: "/message",
        },
        {
          id: "arguments",
          label: "Argomenti JSON",
          type: "textarea",
          defaultValue:
            '[{"type":"f","value":1},{"type":"s","value":"test"}]',
        },
      ],
    },
  ],

  feedbacks: [
    {
      id: "connected",
      name: "Connessione OSC aperta",
      fields: [],
    },
    {
      id: "last-address",
      name: "Ultimo indirizzo ricevuto",
      fields: [
        {
          id: "address",
          label: "Indirizzo atteso",
          type: "text",
        },
      ],
    },
    {
      id: "last-value",
      name: "Ultimo valore ricevuto",
      fields: [
        {
          id: "value",
          label: "Valore atteso",
          type: "text",
        },
      ],
    },
  ],

  variables: [
    {
      id: "connected",
      name: "Connessione aperta",
      initialValue: false,
    },
    {
      id: "lastAddress",
      name: "Ultimo indirizzo ricevuto",
      initialValue: "",
    },
    {
      id: "lastValue",
      name: "Ultimo valore ricevuto",
      initialValue: "",
    },
    {
      id: "lastArguments",
      name: "Ultimi argomenti JSON",
      initialValue: "[]",
    },
    {
      id: "lastRemote",
      name: "Ultimo mittente",
      initialValue: "",
    },
    {
      id: "receivedCount",
      name: "Messaggi ricevuti",
      initialValue: 0,
    },
    {
      id: "localPort",
      name: "Porta locale effettiva",
      initialValue: 0,
    },
    {
      id: "remoteTarget",
      name: "Destinazione remota",
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
      id: "trigger",
      name: "Trigger OSC",
      category: "OSC",
      actionId: "send-trigger",
      options: {
        address: "/trigger",
      },
    },
    {
      id: "value-one",
      name: "Valore OSC 1",
      category: "OSC",
      actionId: "send-value",
      options: {
        address: "/value",
        type: "float",
        value: 1,
      },
    },
  ],

  async execute(actionId, options, context) {
    const key = connectionKey(context);

    if (actionId === "close") {
      const connection = connections.get(key);

      if (connection) {
        connection.socket.close();
        connections.delete(key);
      }

      context.setVariable("osc", "connected", false);

      return { connected: false };
    }

    try {
      const connection =
        await openConnection(context);

      if (actionId === "open") {
        return {
          connected: true,
          remoteHost: connection.remoteHost,
          remotePort: connection.remotePort,
          localHost: connection.localHost,
          localPort: connection.localPort,
        };
      }

      if (actionId === "send-trigger") {
        return await sendMessage(
          connection,
          String(options.address ?? "/trigger"),
          [],
        );
      }

      if (actionId === "send-value") {
        return await sendMessage(
          connection,
          String(options.address ?? "/value"),
          [
            parseTypedArgument(
              String(options.type ?? "float"),
              options.value,
            ),
          ],
        );
      }

      if (actionId === "send-json") {
        const parsed = JSON.parse(
          String(options.arguments ?? "[]"),
        ) as OscArgument[];

        if (!Array.isArray(parsed)) {
          throw new Error(
            "Gli argomenti OSC devono essere un array JSON",
          );
        }

        return await sendMessage(
          connection,
          String(options.address ?? "/message"),
          parsed,
        );
      }

      throw new Error(
        `Azione OSC sconosciuta: ${actionId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore OSC sconosciuto";

      context.setVariable("osc", "lastError", message);
      throw error;
    }
  },
};
