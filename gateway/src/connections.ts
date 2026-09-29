import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type { PluginConnection } from "./types.js";

const dataDirectory = path.resolve(
  process.cwd(),
  "data",
);

const dataFile = path.join(
  dataDirectory,
  "connections.json",
);

let connections: PluginConnection[] = [];

export async function loadConnections() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    const content = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(content) as unknown;

    connections = Array.isArray(parsed)
      ? (parsed as PluginConnection[])
      : [];
  } catch {
    connections = [];
  }
}

async function saveConnections() {
  await mkdir(dataDirectory, { recursive: true });

  const temporaryFile = `${dataFile}.tmp`;

  await writeFile(
    temporaryFile,
    JSON.stringify(connections, null, 2),
    "utf8",
  );

  await rename(temporaryFile, dataFile);
}

export function listConnections(pluginId?: string) {
  return connections.filter(
    (connection) =>
      !pluginId || connection.pluginId === pluginId,
  );
}

export function getConnection(id: string) {
  return connections.find(
    (connection) => connection.id === id,
  );
}

export async function saveConnection(input: {
  id?: string;
  pluginId: string;
  name: string;
  config: Record<string, unknown>;
}) {
  const now = new Date().toISOString();

  if (input.id) {
    const index = connections.findIndex(
      (connection) => connection.id === input.id,
    );

    if (index >= 0) {
      connections[index] = {
        ...connections[index],
        pluginId: input.pluginId,
        name: input.name,
        config: input.config,
        updatedAt: now,
      };

      await saveConnections();
      return connections[index];
    }
  }

  const connection: PluginConnection = {
    id: randomUUID(),
    pluginId: input.pluginId,
    name: input.name,
    config: input.config,
    createdAt: now,
    updatedAt: now,
  };

  connections.push(connection);
  await saveConnections();

  return connection;
}

export async function deleteConnection(id: string) {
  const previousLength = connections.length;

  connections = connections.filter(
    (connection) => connection.id !== id,
  );

  if (connections.length === previousLength) {
    return false;
  }

  await saveConnections();
  return true;
}
