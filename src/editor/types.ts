export type ElementType = "heading" | "text" | "button" | "input" | "container" | "image" | "shape";
export type DeviceMode = "desktop" | "tablet" | "mobile";

export type ActionType =
  | "alert"
  | "confirm"
  | "link"
  | "email"
  | "phone"
  | "copy"
  | "download"
  | "scroll"
  | "show"
  | "hide"
  | "toggle"
  | "setText"
  | "api"
  | "submit"
  | "play"
  | "pause"
  | "openModal"
  | "closeModal"
  | "setStorage"
  | "removeStorage"
  | "customEvent"
  | "fullscreen"
  | "back"
  | "reload"
  | "print"
  | "plugin";

export type ElementAction = {
  id: string;
  type: ActionType;
  value?: string;
  payload?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  delayMs?: number;
  parallelWithNext?: boolean;
  pluginId?: string;
  connectionId?: string;
  pluginActionId?: string;
  pluginOptions?: Record<string, unknown>;
};

export type PluginField = {
  id: string;
  label: string;
  type:
    | "text"
    | "number"
    | "password"
    | "boolean"
    | "select"
    | "textarea";
  required?: boolean;
  defaultValue?: unknown;
  choices?: Array<{
    id: string;
    label: string;
  }>;
};

export type PluginActionManifest = {
  id: string;
  name: string;
  description?: string;
  fields: PluginField[];
};

export type PluginPresetManifest = {
  id: string;
  name: string;
  category: string;
  actionId: string;
  options: Record<string, unknown>;
};

export type PluginVariableManifest = {
  id: string;
  name: string;
  initialValue?: string | number | boolean;
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  configuration: PluginField[];
  actions: PluginActionManifest[];
  variables: PluginVariableManifest[];
  presets: PluginPresetManifest[];
};

export type PluginConnection = {
  id: string;
  pluginId: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ElementFeedback = {
  enabled: boolean;
  pluginId: string;
  variableId: string;
  operator:
    | "equals"
    | "notEquals"
    | "contains"
    | "truthy";
  expectedValue: string;
  activeBackground: string;
  activeColor: string;
  activeText: string;
  visibility: "unchanged" | "show" | "hide";
};

export type CanvasElement = {
  id: string;
  type: ElementType;
  text: string;
  color: string;
  background: string;
  fontSize: number;
  width: number;
  alignment: "left" | "center" | "right";
  positionMode: "grid" | "absolute";
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  gridColumnStart: number;
  gridColumnSpan: number;
  gridRowStart: number;
  gridRowSpan: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  imageSrc?: string;
  objectFit?: "cover" | "contain" | "fill";
  borderRadius?: number;
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  rotation?: number;
  shadow?: "none" | "small" | "medium" | "large";
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  letterSpacing?: number;
  lineHeight?: number;
  shapeType?: "rectangle" | "ellipse" | "line";
  shapeThickness?: number;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "stretch";
  backgroundPosition?: "center" | "top" | "bottom" | "left" | "right";
  isCanvasBackground?: boolean;
  buttonAction?: "none" | "link" | "alert" | "email" | "phone";
  actionValue?: string;
  openNewTab?: boolean;
  actions?: ElementAction[];
  feedback?: ElementFeedback;
};


