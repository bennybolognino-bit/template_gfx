export type PluginFieldType =
  | "text"
  | "number"
  | "password"
  | "boolean"
  | "select"
  | "textarea";

export type PluginField = {
  id: string;
  label: string;
  type: PluginFieldType;
  required?: boolean;
  defaultValue?: unknown;
  choices?: Array<{
    id: string;
    label: string;
  }>;
};

export type PluginActionDefinition = {
  id: string;
  name: string;
  description?: string;
  fields: PluginField[];
};

export type PluginFeedbackDefinition = {
  id: string;
  name: string;
  description?: string;
  fields: PluginField[];
};

export type PluginVariableDefinition = {
  id: string;
  name: string;
  initialValue?: string | number | boolean;
};

export type PluginPreset = {
  id: string;
  name: string;
  category: string;
  actionId: string;
  options: Record<string, unknown>;
};

export type GatewayContext = {
  setVariable: (
    pluginId: string,
    variableId: string,
    value: unknown,
  ) => void;
  getVariable: (
    pluginId: string,
    variableId: string,
  ) => unknown;
  broadcast: (event: unknown) => void;
  log: (
    level: "debug" | "info" | "warn" | "error",
    message: string,
  ) => void;
};

export type PluginDefinition = {
  id: string;
  name: string;
  version: string;
  description: string;
  configuration: PluginField[];
  actions: PluginActionDefinition[];
  feedbacks: PluginFeedbackDefinition[];
  variables: PluginVariableDefinition[];
  presets: PluginPreset[];
  execute: (
    actionId: string,
    options: Record<string, unknown>,
    context: GatewayContext,
  ) => Promise<unknown>;
};
