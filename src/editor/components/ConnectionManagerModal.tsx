"use client";

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  PluginConnection,
  PluginManifest,
} from "../types";

type ConnectionManagerModalProps = {
  connectionManagerOpen: boolean;
  pluginConnections: PluginConnection[];
  pluginCatalog: PluginManifest[];
  connectionDraftId: string | null;
  connectionPluginId: string;
  connectionName: string;
  connectionConfig: Record<string, unknown>;
  setConnectionManagerOpen: Dispatch<
    SetStateAction<boolean>
  >;
  setConnectionDraftId: Dispatch<
    SetStateAction<string | null>
  >;
  setConnectionPluginId: Dispatch<
    SetStateAction<string>
  >;
  setConnectionName: Dispatch<
    SetStateAction<string>
  >;
  setConnectionConfig: Dispatch<
    SetStateAction<Record<string, unknown>>
  >;
  selectConnectionPlugin: (pluginId: string) => void;
  editPluginConnection: (
    connection: PluginConnection,
  ) => void;
  removePluginConnection: (
    connection: PluginConnection,
  ) => Promise<void>;
  savePluginConnection: () => Promise<void>;
};

export function ConnectionManagerModal({
  connectionManagerOpen,
  pluginConnections,
  pluginCatalog,
  connectionDraftId,
  connectionPluginId,
  connectionName,
  connectionConfig,
  setConnectionManagerOpen,
  setConnectionDraftId,
  setConnectionPluginId,
  setConnectionName,
  setConnectionConfig,
  selectConnectionPlugin,
  editPluginConnection,
  removePluginConnection,
  savePluginConnection,
}: ConnectionManagerModalProps) {
  return (
    <>
        {connectionManagerOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6">
            <div className="grid h-[90vh] min-h-0 w-full max-w-5xl grid-cols-[320px_1fr] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              <aside className="min-h-0 overflow-y-auto overscroll-contain border-r border-slate-700 p-4 pb-20">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold">
                    Connessioni
                  </h2>

                  <button
                    type="button"
                    onClick={() => {
                      setConnectionDraftId(null);
                      setConnectionName("");
                      setConnectionPluginId("");
                      setConnectionConfig({});
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm"
                  >
                    Nuova
                  </button>
                </div>

                <div className="space-y-2">
                  {pluginConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-3"
                    >
                      <p className="font-semibold">
                        {connection.name}
                      </p>
                      <p className="mb-3 text-xs text-slate-400">
                        {
                          pluginCatalog.find(
                            (plugin) =>
                              plugin.id ===
                              connection.pluginId,
                          )?.name
                        }
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editPluginConnection(
                              connection,
                            )
                          }
                          className="rounded bg-slate-700 px-2 py-2 text-xs"
                        >
                          Modifica
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removePluginConnection(
                              connection,
                            )
                          }
                          className="rounded bg-red-700 px-2 py-2 text-xs"
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="min-h-0 overflow-y-auto overscroll-contain p-6 pb-24">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {connectionDraftId
                        ? "Modifica connessione"
                        : "Nuova connessione"}
                    </h2>
                    <p className="text-sm text-slate-400">
                      Configurazione persistente del plugin
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setConnectionManagerOpen(false)
                    }
                    className="rounded-lg bg-slate-700 px-4 py-2"
                  >
                    Chiudi
                  </button>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-400">
                      Plugin
                    </span>

                    <select
                      value={connectionPluginId}
                      onChange={(event) =>
                        selectConnectionPlugin(
                          event.target.value,
                        )
                      }
                      disabled={Boolean(connectionDraftId)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 disabled:opacity-50"
                    >
                      <option value="">
                        Seleziona plugin
                      </option>

                      {pluginCatalog.map((plugin) => (
                        <option
                          key={plugin.id}
                          value={plugin.id}
                        >
                          {plugin.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-400">
                      Nome connessione
                    </span>

                    <input
                      value={connectionName}
                      onChange={(event) =>
                        setConnectionName(
                          event.target.value,
                        )
                      }
                      placeholder="es. vMix Regia 1"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                    />
                  </label>

                  {pluginCatalog
                    .find(
                      (plugin) =>
                        plugin.id ===
                        connectionPluginId,
                    )
                    ?.configuration.map((field) => (
                      <label
                        key={field.id}
                        className="block"
                      >
                        <span className="mb-1 block text-sm text-slate-400">
                          {field.label}
                          {field.required ? " *" : ""}
                        </span>

                        {field.type === "select" ? (
                          <select
                            value={String(
                              connectionConfig[field.id] ??
                                field.defaultValue ??
                                "",
                            )}
                            onChange={(event) =>
                              setConnectionConfig(
                                (current) => ({
                                  ...current,
                                  [field.id]:
                                    event.target.value,
                                }),
                              )
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                          >
                            {field.choices?.map((choice) => (
                              <option
                                key={choice.id}
                                value={choice.id}
                              >
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "boolean" ? (
                          <input
                            type="checkbox"
                            checked={Boolean(
                              connectionConfig[field.id] ??
                                field.defaultValue ??
                                false,
                            )}
                            onChange={(event) =>
                              setConnectionConfig(
                                (current) => ({
                                  ...current,
                                  [field.id]:
                                    event.target.checked,
                                }),
                              )
                            }
                            className="h-5 w-5"
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={String(
                              connectionConfig[field.id] ??
                                field.defaultValue ??
                                "",
                            )}
                            onChange={(event) =>
                              setConnectionConfig(
                                (current) => ({
                                  ...current,
                                  [field.id]:
                                    field.type === "number"
                                      ? Number(
                                          event.target.value,
                                        )
                                      : event.target.value,
                                }),
                              )
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                          />
                        )}
                      </label>
                    ))}

                  <button
                    type="button"
                    onClick={savePluginConnection}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
                  >
                    Salva connessione
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}


    </>
  );
}
