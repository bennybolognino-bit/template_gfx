"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Code2,
  Copy,
  Download,
  GripVertical,
  Trash2,
} from "lucide-react";
import { nanoid } from "nanoid";

type ElementType = "heading" | "text" | "button" | "input" | "container" | "image" | "shape";
type DeviceMode = "desktop" | "tablet" | "mobile";

type ActionType =
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

type ElementAction = {
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

type PluginField = {
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

type PluginActionManifest = {
  id: string;
  name: string;
  description?: string;
  fields: PluginField[];
};

type PluginPresetManifest = {
  id: string;
  name: string;
  category: string;
  actionId: string;
  options: Record<string, unknown>;
};

type PluginVariableManifest = {
  id: string;
  name: string;
  initialValue?: string | number | boolean;
};

type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  configuration: PluginField[];
  actions: PluginActionManifest[];
  variables: PluginVariableManifest[];
  presets: PluginPresetManifest[];
};

type PluginConnection = {
  id: string;
  pluginId: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type ElementFeedback = {
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

const PLUGIN_GATEWAY_URL =
  process.env.NEXT_PUBLIC_PLUGIN_GATEWAY_URL ??
  "http://localhost:3210";

const PLUGIN_GATEWAY_WS_URL =
  process.env.NEXT_PUBLIC_PLUGIN_GATEWAY_WS_URL ??
  "ws://localhost:3210";

const PLUGIN_GATEWAY_TOKEN =
  process.env.NEXT_PUBLIC_PLUGIN_GATEWAY_TOKEN ?? "";

function gatewayFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);

  if (PLUGIN_GATEWAY_TOKEN) {
    headers.set(
      "Authorization",
      `Bearer ${PLUGIN_GATEWAY_TOKEN}`,
    );
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

function createGatewaySocket() {
  const url = new URL(PLUGIN_GATEWAY_WS_URL);

  if (PLUGIN_GATEWAY_TOKEN) {
    url.searchParams.set(
      "token",
      PLUGIN_GATEWAY_TOKEN,
    );
  }

  return new WebSocket(url);
}

const actionOptions: Array<{
  type: ActionType;
  label: string;
}> = [
  { type: "alert", label: "Mostra messaggio" },
  { type: "confirm", label: "Richiedi conferma" },
  { type: "link", label: "Apri collegamento" },
  { type: "email", label: "Invia email" },
  { type: "phone", label: "Chiama numero" },
  { type: "copy", label: "Copia testo" },
  { type: "download", label: "Scarica file" },
  { type: "scroll", label: "Scorri verso elemento" },
  { type: "show", label: "Mostra elemento" },
  { type: "hide", label: "Nascondi elemento" },
  { type: "toggle", label: "Attiva/disattiva elemento" },
  { type: "setText", label: "Modifica testo elemento" },
  { type: "api", label: "Chiamata API" },
  { type: "submit", label: "Invia modulo" },
  { type: "play", label: "Riproduci media" },
  { type: "pause", label: "Pausa media" },
  { type: "openModal", label: "Apri finestra modale" },
  { type: "closeModal", label: "Chiudi finestra modale" },
  { type: "setStorage", label: "Salva variabile locale" },
  { type: "removeStorage", label: "Elimina variabile locale" },
  { type: "customEvent", label: "Invia evento personalizzato" },
  { type: "fullscreen", label: "Schermo intero" },
  { type: "back", label: "Pagina precedente" },
  { type: "reload", label: "Ricarica pagina" },
  { type: "print", label: "Stampa pagina" },
  { type: "plugin", label: "Comando plugin" },
];

const targetActionTypes: ActionType[] = [
  "scroll",
  "show",
  "hide",
  "toggle",
  "setText",
  "submit",
  "play",
  "pause",
  "openModal",
  "closeModal",
  "fullscreen",
];

type CanvasElement = {
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

const palette: Array<{
  type: ElementType;
  label: string;
  description: string;
}> = [
  { type: "heading", label: "Titolo", description: "Titolo principale" },
  { type: "text", label: "Testo", description: "Paragrafo di testo" },
  { type: "button", label: "Pulsante", description: "Pulsante interattivo" },
  { type: "input", label: "Campo input", description: "Campo compilabile" },
  { type: "container", label: "Contenitore", description: "Blocco grafico" },
  { type: "image", label: "Immagine", description: "Foto o grafica" },
  { type: "shape", label: "Forma", description: "Rettangolo, ellisse o linea" },
];

const defaults: Record<ElementType, Omit<CanvasElement, "id" | "type">> = {
  heading: {
    text: "Nuovo titolo",
    color: "#0f172a",
    background: "transparent",
    fontSize: 42,
    width: 100,
    alignment: "left",
  },
  text: {
    text: "Inserisci qui il tuo testo.",
    color: "#334155",
    background: "transparent",
    fontSize: 18,
    width: 100,
    alignment: "left",
  },
  button: {
    text: "Pulsante",
    color: "#ffffff",
    background: "#2563eb",
    fontSize: 16,
    width: 100,
    alignment: "left",
  },
  input: {
    text: "Scrivi qualcosa...",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: 16,
    width: 100,
    alignment: "left",
  },
  container: {
    text: "Contenitore",
    color: "#475569",
    background: "#e2e8f0",
    fontSize: 16,
    width: 100,
    alignment: "left",
  },
  image: {
    text: "Immagine",
    color: "#475569",
    background: "#e2e8f0",
    fontSize: 16,
    width: 100,
    alignment: "center",
    positionMode: "grid",
    x: 40,
    y: 40,
    widthPx: 480,
    heightPx: 320,
    gridColumnStart: 0,
    gridColumnSpan: 12,
    gridRowStart: 0,
    gridRowSpan: 6,
    visible: true,
    locked: false,
    zIndex: 1,
    imageSrc: "",
    objectFit: "cover",
    borderRadius: 12,
    opacity: 100,
  },
  shape: {
    text: "Forma",
    color: "#ffffff",
    background: "#2563eb",
    fontSize: 16,
    width: 100,
    alignment: "center",
    positionMode: "grid",
    x: 40,
    y: 40,
    widthPx: 320,
    heightPx: 160,
    gridColumnStart: 0,
    gridColumnSpan: 6,
    gridRowStart: 0,
    gridRowSpan: 4,
    visible: true,
    locked: false,
    zIndex: 1,
    borderRadius: 0,
    opacity: 100,
    borderWidth: 0,
    borderColor: "#0f172a",
    rotation: 0,
    shadow: "none",
    shapeType: "rectangle",
    shapeThickness: 4,
  },
};

function getElementActions(
  element: CanvasElement,
): ElementAction[] {
  if (element.actions?.length) {
    return element.actions;
  }

  if (
    element.buttonAction &&
    element.buttonAction !== "none"
  ) {
    return [
      {
        id: `legacy-${element.id}`,
        type: element.buttonAction as ActionType,
        value: element.actionValue ?? "",
        method: "GET",
        delayMs: 0,
      },
    ];
  }

  return [];
}

function applyElementFeedback(
  element: CanvasElement,
  variables: Record<string, unknown>,
): CanvasElement {
  const feedback = element.feedback;

  if (!feedback?.enabled) return element;

  const key = `${feedback.pluginId}:${feedback.variableId}`;
  const rawValue = variables[key];
  const currentValue = String(rawValue ?? "");
  const expectedValue = feedback.expectedValue ?? "";

  const matches =
    feedback.operator === "equals"
      ? currentValue === expectedValue
      : feedback.operator === "notEquals"
        ? currentValue !== expectedValue
        : feedback.operator === "contains"
          ? currentValue.includes(expectedValue)
          : Boolean(rawValue);

  if (!matches) return element;

  return {
    ...element,
    background:
      feedback.activeBackground || element.background,
    color: feedback.activeColor || element.color,
    text: feedback.activeText || element.text,
    visible:
      feedback.visibility === "hide"
        ? false
        : feedback.visibility === "show"
          ? true
          : element.visible,
  };
}

function PaletteItem({
  type,
  label,
  description,
}: (typeof palette)[number]) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `palette-${type}` });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex w-full cursor-grab items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3 text-left transition hover:border-blue-500 hover:bg-slate-700 active:cursor-grabbing"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <GripVertical className="h-5 w-5 text-slate-500" />

      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-slate-400">{description}</span>
      </span>
    </button>
  );
}

function CanvasItem({
  element,
  selected,
  onSelect,
}: {
  element: CanvasElement;
  selected: boolean;
  onSelect: (additive: boolean) => void;
}) {
  const commonClass = selected
    ? "outline outline-2 outline-offset-4 outline-blue-500"
    : "outline-none";

  const typographyStyle = {
    fontFamily:
      element.fontFamily ??
      "Arial, Helvetica, sans-serif",
    fontWeight: element.fontWeight ?? 400,
    fontStyle: element.fontStyle ?? "normal",
    textDecoration: element.textDecoration ?? "none",
    letterSpacing: element.letterSpacing ?? 0,
    lineHeight: element.lineHeight ?? 1.2,
  };

  if (element.type === "heading") {
    return (
      <h1
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        className={`h-full w-full cursor-pointer font-bold ${commonClass}`}
        style={{ color: element.color, fontSize: element.fontSize, ...typographyStyle }}
      >
        {element.text}
      </h1>
    );
  }

  if (element.type === "text") {
    return (
      <p
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        className={`h-full w-full cursor-pointer ${commonClass}`}
        style={{ color: element.color, fontSize: element.fontSize, ...typographyStyle }}
      >
        {element.text}
      </p>
    );
  }

  if (element.type === "button") {
    return (
      <button
        type="button"
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        className={`h-full w-full cursor-pointer rounded-lg px-5 py-3 font-semibold shadow-sm ${commonClass}`}
        style={{
          color: element.color,
          background: element.backgroundImage ? "transparent" : element.background,
          fontSize: element.fontSize,
          ...typographyStyle,
        }}
      >
        {element.text}
      </button>
    );
  }

  if (element.type === "input") {
    return (
      <input
        readOnly
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        placeholder={element.text}
        className={`h-full w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 ${commonClass}`}
        style={{
          color: element.color,
          background: element.backgroundImage ? "transparent" : element.background,
          fontSize: element.fontSize,
          ...typographyStyle,
        }}
      />
    );
  }

  if (element.type === "shape") {
    if (element.shapeType === "line") {
      return (
        <div
          onClick={(event) =>
            onSelect(
              event.shiftKey ||
                event.ctrlKey ||
                event.metaKey,
            )
          }
          className={`flex h-full w-full cursor-pointer items-center ${commonClass}`}
        >
          <div
            className="w-full"
            style={{
              height: element.shapeThickness ?? 4,
              background: element.backgroundImage ? "transparent" : element.background,
            }}
          />
        </div>
      );
    }

    return (
      <div
        onClick={(event) =>
          onSelect(
            event.shiftKey ||
              event.ctrlKey ||
              event.metaKey,
          )
        }
        className={`h-full w-full cursor-pointer ${commonClass}`}
        style={{
          background: element.backgroundImage ? "transparent" : element.background,
          borderRadius:
            element.shapeType === "ellipse"
              ? "50%"
              : element.borderRadius ?? 0,
        }}
      />
    );
  }

  if (element.type === "image") {
    if (!element.imageSrc) {
      return (
        <div
          onClick={(event) =>
            onSelect(
              event.shiftKey ||
                event.ctrlKey ||
                event.metaKey,
            )
          }
          className={`flex h-full w-full cursor-pointer items-center justify-center border border-dashed border-slate-400 bg-slate-100 text-slate-500 ${commonClass}`}
          style={{
            borderRadius: element.borderRadius ?? 12,
          }}
        >
          Seleziona o carica un’immagine
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={element.text}
        onClick={(event) =>
          onSelect(
            event.shiftKey ||
              event.ctrlKey ||
              event.metaKey,
          )
        }
        className={`h-full w-full cursor-pointer bg-center bg-no-repeat ${commonClass}`}
        style={{
          backgroundImage: `url(${element.imageSrc})`,
          backgroundSize:
            element.objectFit === "fill"
              ? "100% 100%"
              : element.objectFit ?? "cover",
          borderRadius: element.borderRadius ?? 12,
        }}
      />
    );
  }

  return (
    <div
      onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
      className={`h-full min-h-0 w-full cursor-pointer rounded-xl border border-dashed border-slate-400 p-6 ${commonClass}`}
      style={{
        color: element.color,
        background: element.backgroundImage ? "transparent" : element.background,
        fontSize: element.fontSize,
      }}
    >
      {element.text}
    </div>
  );
}

function generateCode(elements: CanvasElement[]) {
  const generatedElements = elements
    .filter((element) => element.visible !== false)
    .map((element) => {
      const text = JSON.stringify(element.text);

      const gridSpan = element.gridColumnSpan ?? 12;
      const gridColumnStart = element.gridColumnStart ?? 0;
      const gridRowStart = element.gridRowStart ?? 0;
      const gridRowSpan = element.gridRowSpan ?? 3;

      const gridColumn =
        gridColumnStart > 0
          ? `${gridColumnStart} / span ${gridSpan}`
          : `span ${gridSpan}`;

      const gridRow =
        gridRowStart > 0
          ? `${gridRowStart} / span ${gridRowSpan}`
          : `span ${gridRowSpan}`;

      const layoutStyle =
        element.isCanvasBackground
          ? `position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0`
          : element.positionMode === "absolute"
            ? `position: "absolute", left: ${element.x ?? 0}, top: ${element.y ?? 0}, width: ${element.widthPx ?? 320}, height: ${element.heightPx ?? 120}, zIndex: ${Math.max(1, element.zIndex ?? 1)}`
            : `position: "relative", gridColumn: "${gridColumn}", gridRow: "${gridRow}", zIndex: ${Math.max(1, element.zIndex ?? 1)}`;

      const shadowValue =
        element.shadow === "small"
          ? "0 2px 8px rgba(15, 23, 42, 0.18)"
          : element.shadow === "medium"
            ? "0 8px 24px rgba(15, 23, 42, 0.24)"
            : element.shadow === "large"
              ? "0 18px 50px rgba(15, 23, 42, 0.32)"
              : "none";

      const backgroundImageValue = element.backgroundImage
        ? `url(${element.backgroundImage})`
        : "none";

      const appearanceStyle =
        `border: "${element.borderWidth ?? 0}px solid ${element.borderColor ?? "#0f172a"}", borderRadius: ${element.borderRadius ?? 0}, transform: "rotate(${element.rotation ?? 0}deg)", boxShadow: "${shadowValue}", fontFamily: ${JSON.stringify(element.fontFamily ?? "Arial, Helvetica, sans-serif")}, fontWeight: ${element.fontWeight ?? 400}, fontStyle: "${element.fontStyle ?? "normal"}", textDecoration: "${element.textDecoration ?? "none"}", letterSpacing: ${element.letterSpacing ?? 0}, lineHeight: ${element.lineHeight ?? 1.2}, backgroundImage: ${JSON.stringify(backgroundImageValue)}, backgroundSize: "${element.backgroundSize === "stretch" ? "100% 100%" : element.backgroundSize ?? "cover"}", backgroundPosition: "${element.backgroundPosition ?? "center"}", backgroundRepeat: "no-repeat"`;

      switch (element.type) {
        case "heading":
          return `      <h1 id="element-${element.id}" style={{ color: "${element.color}", fontSize: ${element.fontSize}, ${layoutStyle}, ${appearanceStyle}, textAlign: "${element.alignment ?? "left"}", fontWeight: 700 }}>${element.text}</h1>`;

        case "text":
          return `      <p id="element-${element.id}" style={{ color: "${element.color}", fontSize: ${element.fontSize}, ${layoutStyle}, ${appearanceStyle}, textAlign: "${element.alignment ?? "left"}" }}>${element.text}</p>`;

        case "button": {
          const actions = getElementActions(element);
          const actionsJson = JSON.stringify(actions);

          const buttonStyle =
            `${layoutStyle}, ${appearanceStyle}, color: "${element.color}", backgroundColor: "${element.background}", fontSize: ${element.fontSize}, padding: "12px 20px", display: "inline-flex", alignItems: "center", justifyContent: "center"`;

          return `      <button id="element-${element.id}" type="button" onClick={() => runActions(${actionsJson})} style={{ ${buttonStyle} }}>${element.text}</button>`;
        }

        case "input":
          return `      <input id="element-${element.id}" placeholder=${text} style={{ color: "${element.color}", backgroundColor: "${element.background}", fontSize: ${element.fontSize}, ${layoutStyle}, ${appearanceStyle}, textAlign: "${element.alignment ?? "left"}", padding: 12, border: "1px solid #cbd5e1", borderRadius: 8 }} />`;

        case "shape": {
          if (element.shapeType === "line") {
            return `      <div id="element-${element.id}" style={{ ${layoutStyle}, ${appearanceStyle}, display: "flex", alignItems: "center" }}><div style={{ width: "100%", height: ${element.shapeThickness ?? 4}, backgroundColor: "${element.background}" }} /></div>`;
          }

          const shapeRadius =
            element.shapeType === "ellipse"
              ? "50%"
              : `${element.borderRadius ?? 0}px`;

          return `      <div id="element-${element.id}" style={{ ${layoutStyle}, ${appearanceStyle}, backgroundColor: "${element.background}", borderRadius: "${shapeRadius}" }} />`;
        }

        case "image": {
          const source = JSON.stringify(
            element.imageSrc ?? "",
          );

          return `      <div id="element-${element.id}" style={{ ${layoutStyle}, ${appearanceStyle} }}><img src=${source} alt=${text} style={{ width: "100%", height: "100%", objectFit: "${element.objectFit ?? "cover"}", borderRadius: ${element.borderRadius ?? 12} }} /></div>`;
        }

        case "container":
          return `      <div id="element-${element.id}" style={{ color: "${element.color}", backgroundColor: "${element.background}", fontSize: ${element.fontSize}, ${layoutStyle}, ${appearanceStyle}, textAlign: "${element.alignment ?? "left"}", minHeight: 128, padding: 24, borderRadius: 12 }}>${element.text}</div>`;
      }
    })
    .join("\n");

  const feedbackConfig = elements
    .filter((element) => element.feedback?.enabled)
    .map((element) => ({
      elementId: `element-${element.id}`,
      feedback: element.feedback,
      baseBackground: element.background,
      baseColor: element.color,
      baseText: element.text,
      baseVisible: element.visible !== false,
    }));

  return `"use client";

type GeneratedAction = {
  type: string;
  value?: string;
  payload?: string;
  method?: string;
  delayMs?: number;
  parallelWithNext?: boolean;
  pluginId?: string;
  connectionId?: string;
  pluginActionId?: string;
  pluginOptions?: Record<string, unknown>;
};

async function runActions(actions: GeneratedAction[]) {
  for (
    let actionIndex = 0;
    actionIndex < actions.length;
    actionIndex += 1
  ) {
    let action = actions[actionIndex];

    if (action.parallelWithNext) {
      const group = [action];
      let groupIndex = actionIndex;

      while (
        groupIndex < actions.length - 1 &&
        actions[groupIndex].parallelWithNext
      ) {
        groupIndex += 1;
        group.push(actions[groupIndex]);
      }

      await Promise.all(
        group.map((groupAction) =>
          runActions([
            {
              ...groupAction,
              parallelWithNext: false,
            },
          ]),
        ),
      );

      actionIndex = groupIndex;
      continue;
    }
    if ((action.delayMs ?? 0) > 0) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, action.delayMs),
      );
    }

    const value = action.value ?? "";
    const target = value
      ? document.getElementById(value)
      : null;

    if (action.type === "plugin") {
      const response = await fetch(
        GATEWAY_URL + "/api/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(GATEWAY_TOKEN
              ? {
                  Authorization:
                    "Bearer " + GATEWAY_TOKEN,
                }
              : {}),
          },
          body: JSON.stringify({
            pluginId: action.pluginId,
            connectionId: action.connectionId,
            actionId: action.pluginActionId,
            options: action.pluginOptions ?? {},
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Comando plugin fallito");
      }

      continue;
    }

    if (action.type === "alert") window.alert(value);
    if (action.type === "confirm" && !window.confirm(value)) break;
    if (action.type === "link") window.open(value, "_blank");
    if (action.type === "email") window.location.href = "mailto:" + value;
    if (action.type === "phone") window.location.href = "tel:" + value;
    if (action.type === "copy") await navigator.clipboard.writeText(value);

    if (action.type === "download") {
      const link = document.createElement("a");
      link.href = value;
      link.download = action.payload ?? "";
      link.click();
    }

    if (action.type === "scroll") {
      target?.scrollIntoView({ behavior: "smooth" });
    }

    if (action.type === "show" && target) target.style.display = "none" ? "" : "";
    if (action.type === "hide" && target) target.style.display = "none";

    if (action.type === "toggle" && target) {
      target.style.display =
        target.style.display === "none" ? "" : "none";
    }

    if (action.type === "setText" && target) {
      target.textContent = action.payload ?? "";
    }

    if (action.type === "api") {
      await fetch(value, {
        method: action.method ?? "GET",
        headers: { "Content-Type": "application/json" },
        body:
          action.method === "GET"
            ? undefined
            : action.payload || undefined,
      });
    }

    if (action.type === "submit" && target instanceof HTMLFormElement) {
      target.requestSubmit();
    }

    if (action.type === "play" && target instanceof HTMLMediaElement) {
      await target.play();
    }

    if (action.type === "pause" && target instanceof HTMLMediaElement) {
      target.pause();
    }

    if (action.type === "openModal" && target instanceof HTMLDialogElement) {
      target.showModal();
    }

    if (action.type === "closeModal" && target instanceof HTMLDialogElement) {
      target.close();
    }

    if (action.type === "setStorage") {
      localStorage.setItem(value, action.payload ?? "");
    }

    if (action.type === "removeStorage") {
      localStorage.removeItem(value);
    }

    if (action.type === "customEvent") {
      window.dispatchEvent(
        new CustomEvent(value, { detail: action.payload }),
      );
    }

    if (action.type === "fullscreen") {
      await (target ?? document.documentElement).requestFullscreen?.();
    }

    if (action.type === "back") history.back();
    if (action.type === "reload") location.reload();
    if (action.type === "print") window.print();
  }
}

export default function GeneratedPage() {
  useEffect(() => {
    const socketUrl = new URL(GATEWAY_WS_URL);

    if (GATEWAY_TOKEN) {
      socketUrl.searchParams.set(
        "token",
        GATEWAY_TOKEN,
      );
    }

    const socket = new WebSocket(socketUrl);

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data));

        if (event.type === "variable-update") {
          applyGeneratedFeedback(event);
        }
      } catch {
        // Ignora messaggi non validi.
      }
    };

    return () => socket.close();
  }, []);

  return (
    <main style={{
      minHeight: "100vh",
      position: "relative",
      display: "grid",
      gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
      gridAutoRows: "40px",
      alignContent: "start",
      gap: 24,
      padding: 32,
      background: "#f8fafc"
    }}>
${generatedElements || "      {/* Trascina dei componenti nel canvas */}"}
    </main>
  );
}
`;
}

export default function Home() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<ElementType | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [draggedCanvasId, setDraggedCanvasId] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [projectName, setProjectName] = useState("Nuovo progetto");
  const importInputRef = useRef<HTMLInputElement>(null);

  const [pluginCatalog, setPluginCatalog] =
    useState<PluginManifest[]>([]);
  const [pluginConnections, setPluginConnections] =
    useState<PluginConnection[]>([]);
  const [
    connectionManagerOpen,
    setConnectionManagerOpen,
  ] = useState(false);
  const [connectionDraftId, setConnectionDraftId] =
    useState<string | null>(null);
  const [connectionPluginId, setConnectionPluginId] =
    useState("");
  const [connectionName, setConnectionName] =
    useState("");
  const [connectionConfig, setConnectionConfig] =
    useState<Record<string, unknown>>({});
  const [pluginGatewayOnline, setPluginGatewayOnline] =
    useState(false);
  const [pluginSocketOnline, setPluginSocketOnline] =
    useState(false);
  const [pluginVariables, setPluginVariables] =
    useState<Record<string, unknown>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  const selected = elements.find((element) => element.id === selectedId);
  const generatedCode = useMemo(() => generateCode(elements), [elements]);

  const renderedElements = useMemo(
    () =>
      elements.map((element) =>
        applyElementFeedback(element, pluginVariables),
      ),
    [elements, pluginVariables],
  );

  useEffect(() => {
    let active = true;

    async function loadPlugins() {
      try {
        const response = await gatewayFetch(
          `${PLUGIN_GATEWAY_URL}/api/plugins`,
        );

        if (!response.ok) {
          throw new Error("Gateway non disponibile");
        }

        const plugins =
          (await response.json()) as PluginManifest[];

        if (active) {
          setPluginCatalog(plugins);
          setPluginGatewayOnline(true);
        }
      } catch {
        if (active) {
          setPluginGatewayOnline(false);
        }
      }
    }

    void loadPlugins();

    const timer = window.setInterval(
      () => void loadPlugins(),
      10000,
    );

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadConnections() {
      try {
        const response = await gatewayFetch(
          `${PLUGIN_GATEWAY_URL}/api/connections`,
        );

        if (!response.ok) return;

        const connections =
          (await response.json()) as PluginConnection[];

        if (active) {
          setPluginConnections(connections);
        }
      } catch {
        // Il gateway potrebbe non essere ancora avviato.
      }
    }

    void loadConnections();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let active = true;

    async function loadVariables() {
      try {
        const response = await gatewayFetch(
          `${PLUGIN_GATEWAY_URL}/api/variables`,
        );

        if (!response.ok) return;

        const values =
          (await response.json()) as Record<string, unknown>;

        if (active) {
          setPluginVariables(values);
        }
      } catch {
        // Il WebSocket tenterà nuovamente la connessione.
      }
    }

    function connect() {
      if (!active) return;

      socket = createGatewaySocket();

      socket.onopen = () => {
        if (active) {
          setPluginSocketOnline(true);
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(
            String(event.data),
          ) as {
            type?: string;
            pluginId?: string;
  connectionId?: string;
            variableId?: string;
            value?: unknown;
          };

          if (
            message.type === "variable-update" &&
            message.pluginId &&
            message.variableId
          ) {
            const key =
              `${message.pluginId}:${message.variableId}`;

            setPluginVariables((current) => ({
              ...current,
              [key]: message.value,
            }));
          }
        } catch {
          // Ignora messaggi non JSON.
        }
      };

      socket.onclose = () => {
        if (!active) return;

        setPluginSocketOnline(false);
        reconnectTimer = window.setTimeout(
          connect,
          2000,
        );
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    void loadVariables();
    connect();

    return () => {
      active = false;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedProjectName = window.localStorage.getItem(
        "template-gfx-project-name",
      );

      if (savedProjectName) {
        setProjectName(savedProjectName);
      }

      const savedProject = window.localStorage.getItem(
        "template-gfx-project",
      );

      if (savedProject) {
        try {
          const parsedProject = JSON.parse(
            savedProject,
          ) as CanvasElement[];

          if (Array.isArray(parsedProject)) {
            setElements(
              parsedProject.map((element) => ({
                ...element,
                width: element.width ?? 100,
                alignment: element.alignment ?? "left",
                positionMode: element.positionMode ?? "grid",
                x: element.x ?? 40,
                y: element.y ?? 40,
                widthPx: element.widthPx ?? 320,
                heightPx: element.heightPx ?? 120,
                gridColumnStart: element.gridColumnStart ?? 0,
                gridColumnSpan:
                  element.gridColumnSpan ??
                  Math.max(
                    1,
                    Math.round((element.width ?? 100) / (100 / 12)),
                  ),
                gridRowStart: element.gridRowStart ?? 0,
                gridRowSpan: element.gridRowSpan ?? 3,
                visible: element.visible ?? true,
                locked: element.locked ?? false,
                zIndex: element.zIndex ?? 1,
              })),
            );
          }
        } catch {
          window.localStorage.removeItem("template-gfx-project");
        }
      }

      setProjectLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!projectLoaded) return;

    window.localStorage.setItem(
      "template-gfx-project",
      JSON.stringify(elements),
    );

    window.localStorage.setItem(
      "template-gfx-project-name",
      projectName,
    );
  }, [elements, projectLoaded, projectName]);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (id.startsWith("palette-")) {
      setActiveType(id.replace("palette-", "") as ElementType);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedId = String(event.active.id);

    if (draggedId.startsWith("palette-")) {
      const type = draggedId.replace("palette-", "") as ElementType;
      const id = nanoid();

      setElements((current) => [
        ...current,
        { id, type, ...defaults[type] },
      ]);

      setSelectedId(id);
      setSelectedIds([id]);
    }

    setActiveType(null);
  }

  function toggleElementVisibility(id: string) {
    setElements((current) =>
      current.map((element) =>
        element.id === id
          ? {
              ...element,
              visible: element.visible === false,
            }
          : element,
      ),
    );
  }

  function toggleElementLock(id: string) {
    setElements((current) =>
      current.map((element) =>
        element.id === id
          ? {
              ...element,
              locked: !element.locked,
            }
          : element,
      ),
    );
  }

  function moveLayer(
    id: string,
    direction: "up" | "down" | "front" | "back",
  ) {
    setElements((current) => {
      const index = current.findIndex(
        (element) => element.id === id,
      );

      let targetIndex =
        direction === "up" ? index + 1 : index - 1;

      if (direction === "front") {
        targetIndex = current.length - 1;
      }

      if (direction === "back") {
        targetIndex = 0;
      }

      if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [movedElement] = next.splice(index, 1);
      next.splice(targetIndex, 0, movedElement);

      return next.map((element, layerIndex) => ({
        ...element,
        zIndex: layerIndex + 1,
      }));
    });
  }

  function selectElement(id: string, additive: boolean) {
    if (!additive) {
      setSelectedId(id);
      setSelectedIds([id]);
      setSelectedIds([id]);
      return;
    }

    const alreadySelected = selectedIds.includes(id);
    const nextSelection = alreadySelected
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];

    setSelectedIds(nextSelection);
    setSelectedId(
      alreadySelected
        ? nextSelection[nextSelection.length - 1] ?? null
        : id,
    );
  }

  function alignSelected(
    mode:
      | "left"
      | "center"
      | "right"
      | "top"
      | "middle"
      | "bottom",
  ) {
    const selectedElements = elements.filter((element) =>
      selectedIds.includes(element.id),
    );

    if (selectedElements.length < 2) return;

    const allAbsolute = selectedElements.every(
      (element) => element.positionMode === "absolute",
    );

    if (allAbsolute) {
      const minimumX = Math.min(
        ...selectedElements.map((element) => element.x ?? 0),
      );

      const maximumX = Math.max(
        ...selectedElements.map(
          (element) =>
            (element.x ?? 0) + (element.widthPx ?? 320),
        ),
      );

      const minimumY = Math.min(
        ...selectedElements.map((element) => element.y ?? 0),
      );

      const maximumY = Math.max(
        ...selectedElements.map(
          (element) =>
            (element.y ?? 0) + (element.heightPx ?? 120),
        ),
      );

      const horizontalCenter = (minimumX + maximumX) / 2;
      const verticalCenter = (minimumY + maximumY) / 2;

      setElements((current) =>
        current.map((element) => {
          if (!selectedIds.includes(element.id) || element.locked) return element;

          if (mode === "left") {
            return { ...element, x: minimumX };
          }

          if (mode === "center") {
            return {
              ...element,
              x: Math.round(
                horizontalCenter -
                  (element.widthPx ?? 320) / 2,
              ),
            };
          }

          if (mode === "right") {
            return {
              ...element,
              x: maximumX - (element.widthPx ?? 320),
            };
          }

          if (mode === "top") {
            return { ...element, y: minimumY };
          }

          if (mode === "middle") {
            return {
              ...element,
              y: Math.round(
                verticalCenter -
                  (element.heightPx ?? 120) / 2,
              ),
            };
          }

          return {
            ...element,
            y: maximumY - (element.heightPx ?? 120),
          };
        }),
      );

      return;
    }

    const gridElements = selectedElements.filter(
      (element) => element.positionMode !== "absolute",
    );

    if (gridElements.length < 2) return;

    const minimumColumn = Math.min(
      ...gridElements.map(
        (element) => element.gridColumnStart || 1,
      ),
    );

    const maximumColumn = Math.max(
      ...gridElements.map(
        (element) =>
          (element.gridColumnStart || 1) +
          (element.gridColumnSpan ?? 1),
      ),
    );

    const minimumRow = Math.min(
      ...gridElements.map(
        (element) => element.gridRowStart || 1,
      ),
    );

    const maximumRow = Math.max(
      ...gridElements.map(
        (element) =>
          (element.gridRowStart || 1) +
          (element.gridRowSpan ?? 1),
      ),
    );

    const horizontalCenter =
      (minimumColumn + maximumColumn) / 2;

    const verticalCenter = (minimumRow + maximumRow) / 2;

    setElements((current) =>
      current.map((element) => {
        if (
          !selectedIds.includes(element.id) || element.locked ||
          element.positionMode === "absolute"
        ) {
          return element;
        }

        const columnSpan = element.gridColumnSpan ?? 1;
        const rowSpan = element.gridRowSpan ?? 1;

        if (mode === "left") {
          return {
            ...element,
            gridColumnStart: minimumColumn,
          };
        }

        if (mode === "center") {
          return {
            ...element,
            gridColumnStart: Math.max(
              1,
              Math.min(
                13 - columnSpan,
                Math.round(horizontalCenter - columnSpan / 2),
              ),
            ),
          };
        }

        if (mode === "right") {
          return {
            ...element,
            gridColumnStart: Math.max(
              1,
              maximumColumn - columnSpan,
            ),
          };
        }

        if (mode === "top") {
          return {
            ...element,
            gridRowStart: minimumRow,
          };
        }

        if (mode === "middle") {
          return {
            ...element,
            gridRowStart: Math.max(
              1,
              Math.round(verticalCenter - rowSpan / 2),
            ),
          };
        }

        return {
          ...element,
          gridRowStart: Math.max(
            1,
            maximumRow - rowSpan,
          ),
        };
      }),
    );
  }

  function distributeSelected(
    axis: "horizontal" | "vertical",
  ) {
    const selectedElements = elements.filter((element) =>
      selectedIds.includes(element.id),
    );

    if (selectedElements.length < 3) return;

    const allAbsolute = selectedElements.every(
      (element) => element.positionMode === "absolute",
    );

    if (allAbsolute) {
      const sorted = [...selectedElements].sort((first, second) =>
        axis === "horizontal"
          ? (first.x ?? 0) - (second.x ?? 0)
          : (first.y ?? 0) - (second.y ?? 0),
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const start =
        axis === "horizontal" ? first.x ?? 0 : first.y ?? 0;

      const end =
        axis === "horizontal"
          ? (last.x ?? 0) + (last.widthPx ?? 320)
          : (last.y ?? 0) + (last.heightPx ?? 120);

      const totalSize = sorted.reduce(
        (sum, element) =>
          sum +
          (
            axis === "horizontal"
              ? element.widthPx ?? 320
              : element.heightPx ?? 120
          ),
        0,
      );

      const gap = Math.max(
        0,
        (end - start - totalSize) / (sorted.length - 1),
      );

      const positions = new Map<string, number>();
      let cursor = start;

      sorted.forEach((element) => {
        positions.set(element.id, Math.round(cursor));

        cursor +=
          (
            axis === "horizontal"
              ? element.widthPx ?? 320
              : element.heightPx ?? 120
          ) + gap;
      });

      setElements((current) =>
        current.map((element) => {
          const position = positions.get(element.id);

          if (position === undefined) return element;

          return axis === "horizontal"
            ? { ...element, x: position }
            : { ...element, y: position };
        }),
      );

      return;
    }

    const gridElements = selectedElements
      .filter((element) => element.positionMode !== "absolute")
      .sort((first, second) =>
        axis === "horizontal"
          ? (first.gridColumnStart ?? 0) -
            (second.gridColumnStart ?? 0)
          : (first.gridRowStart ?? 0) -
            (second.gridRowStart ?? 0),
      );

    if (gridElements.length < 3) return;

    const positions = new Map<string, number>();

    if (axis === "horizontal") {
      const totalColumns = gridElements.reduce(
        (sum, element) => sum + (element.gridColumnSpan ?? 1),
        0,
      );

      const gap = Math.max(
        0,
        (12 - totalColumns) / (gridElements.length - 1),
      );

      let column = 1;

      gridElements.forEach((element) => {
        positions.set(element.id, Math.round(column));
        column += (element.gridColumnSpan ?? 1) + gap;
      });
    } else {
      let row = 1;

      gridElements.forEach((element) => {
        positions.set(element.id, row);
        row += (element.gridRowSpan ?? 1) + 1;
      });
    }

    setElements((current) =>
      current.map((element) => {
        const position = positions.get(element.id);

        if (position === undefined) return element;

        return axis === "horizontal"
          ? { ...element, gridColumnStart: position }
          : { ...element, gridRowStart: position };
      }),
    );
  }

  function setCanvasBackground(id: string) {
    setElements((current) =>
      current.map((element) => {
        if (element.id === id && element.type === "image") {
          return {
            ...element,
            isCanvasBackground: true,
            positionMode: "absolute",
            x: 0,
            y: 0,
            zIndex: 0,
            locked: true,
            visible: true,
            objectFit: "cover",
          };
        }

        if (element.isCanvasBackground) {
          return {
            ...element,
            isCanvasBackground: false,
            locked: false,
            zIndex: Math.max(1, element.zIndex ?? 1),
          };
        }

        return {
          ...element,
          zIndex: Math.max(1, element.zIndex ?? 1),
        };
      }),
    );
  }

  function removeCanvasBackground(id: string) {
    setElements((current) =>
      current.map((element) =>
        element.id === id
          ? {
              ...element,
              isCanvasBackground: false,
              positionMode: "grid",
              locked: false,
              zIndex: 1,
              gridColumnStart: 1,
              gridColumnSpan: 12,
              gridRowStart: 1,
              gridRowSpan: 6,
            }
          : element,
      ),
    );
  }

  function handleBackgroundImageUpload(file: File) {
    const maximumSize = 2 * 1024 * 1024;

    if (file.size > maximumSize) {
      window.alert(
        "L'immagine è troppo grande. Dimensione massima: 2 MB.",
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert("Il file selezionato non è un'immagine.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSelected({
          backgroundImage: reader.result,
        });
      }
    };

    reader.readAsDataURL(file);
  }

  function handleImageUpload(file: File) {
    const maximumSize = 2 * 1024 * 1024;

    if (file.size > maximumSize) {
      window.alert(
        "L'immagine è troppo grande. Dimensione massima: 2 MB.",
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert("Il file selezionato non è un'immagine.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSelected({ imageSrc: reader.result });
      }
    };

    reader.readAsDataURL(file);
  }

  function updateElementFeedback(
    changes: Partial<ElementFeedback>,
  ) {
    if (!selected) return;

    updateSelected({
      feedback: {
        enabled: true,
        pluginId: "",
        variableId: "",
        operator: "equals",
        expectedValue: "",
        activeBackground: "#16a34a",
        activeColor: "#ffffff",
        activeText: "",
        visibility: "unchanged",
        ...(selected.feedback ?? {}),
        ...changes,
      },
    });
  }

  function updateSelected(changes: Partial<CanvasElement>) {
    if (!selectedId) return;

    setElements((current) =>
      current.map((element) =>
        element.id === selectedId ? { ...element, ...changes } : element,
      ),
    );
  }

  function deleteSelected() {
    const idsToDelete =
      selectedIds.length > 0
        ? selectedIds
        : selectedId
          ? [selectedId]
          : [];

    setElements((current) =>
      current.filter(
        (element) => !idsToDelete.includes(element.id) || element.locked,
      ),
    );

    setSelectedId(null);
    setSelectedIds([]);
  }

  function moveAbsoluteElement(
    id: string,
    deltaX: number,
    deltaY: number,
  ) {
    setElements((current) =>
      current.map((element) =>
        element.id === id
          ? {
              ...element,
              x: Math.max(0, (element.x ?? 0) + deltaX),
              y: Math.max(0, (element.y ?? 0) + deltaY),
            }
          : element,
      ),
    );
  }

  function reorderCanvasElement(targetId: string) {
    if (!draggedCanvasId || draggedCanvasId === targetId) return;

    setElements((current) => {
      const sourceIndex = current.findIndex(
        (element) => element.id === draggedCanvasId,
      );
      const targetIndex = current.findIndex(
        (element) => element.id === targetId,
      );

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [movedElement] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedElement);

      return next;
    });

    setDraggedCanvasId(null);
  }

  function duplicateSelected() {
    if (!selected) return;

    const duplicate = {
      ...selected,
      id: nanoid(),
    };

    setElements((current) => {
      const selectedIndex = current.findIndex(
        (element) => element.id === selected.id,
      );

      const next = [...current];
      next.splice(selectedIndex + 1, 0, duplicate);
      return next;
    });

    setSelectedId(duplicate.id);
    setSelectedIds([duplicate.id]);
  }

  function moveSelected(direction: "up" | "down") {
    if (!selectedId) return;

    setElements((current) => {
      const currentIndex = current.findIndex(
        (element) => element.id === selectedId,
      );

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      [next[currentIndex], next[targetIndex]] = [
        next[targetIndex],
        next[currentIndex],
      ];

      return next;
    });
  }

  async function reloadPluginConnections() {
    const response = await gatewayFetch(
      `${PLUGIN_GATEWAY_URL}/api/connections`,
    );

    if (!response.ok) {
      throw new Error(
        "Impossibile caricare le connessioni",
      );
    }

    const connections =
      (await response.json()) as PluginConnection[];

    setPluginConnections(connections);
  }

  function selectConnectionPlugin(pluginId: string) {
    const plugin = pluginCatalog.find(
      (item) => item.id === pluginId,
    );

    const defaults = Object.fromEntries(
      (plugin?.configuration ?? []).map((field) => [
        field.id,
        field.defaultValue ?? "",
      ]),
    );

    setConnectionPluginId(pluginId);
    setConnectionConfig(defaults);
  }

  function openConnectionManager(pluginId = "") {
    setConnectionDraftId(null);
    setConnectionName("");

    if (pluginId) {
      selectConnectionPlugin(pluginId);
    } else {
      setConnectionPluginId("");
      setConnectionConfig({});
    }

    setConnectionManagerOpen(true);
  }

  function editPluginConnection(
    connection: PluginConnection,
  ) {
    setConnectionDraftId(connection.id);
    setConnectionPluginId(connection.pluginId);
    setConnectionName(connection.name);
    setConnectionConfig(connection.config);
    setConnectionManagerOpen(true);
  }

  async function savePluginConnection() {
    if (!connectionPluginId || !connectionName.trim()) {
      window.alert(
        "Seleziona il plugin e inserisci il nome.",
      );
      return;
    }

    const response = await gatewayFetch(
      `${PLUGIN_GATEWAY_URL}/api/connections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: connectionDraftId ?? undefined,
          pluginId: connectionPluginId,
          name: connectionName.trim(),
          config: connectionConfig,
        }),
      },
    );

    const result = (await response.json()) as {
      ok?: boolean;
      error?: string;
    };

    if (!response.ok || !result.ok) {
      window.alert(
        result.error ?? "Salvataggio fallito",
      );
      return;
    }

    await reloadPluginConnections();
    setConnectionDraftId(null);
    setConnectionName("");
    setConnectionManagerOpen(false);
  }

  async function removePluginConnection(
    connection: PluginConnection,
  ) {
    const confirmed = window.confirm(
      `Eliminare la connessione "${connection.name}"?`,
    );

    if (!confirmed) return;

    const response = await gatewayFetch(
      `${PLUGIN_GATEWAY_URL}/api/connections/${encodeURIComponent(connection.id)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      window.alert("Eliminazione fallita.");
      return;
    }

    await reloadPluginConnections();

    setElements((current) =>
      current.map((element) => ({
        ...element,
        actions: element.actions?.map((action) =>
          action.connectionId === connection.id
            ? { ...action, connectionId: "" }
            : action,
        ),
      })),
    );
  }

  function createNewProject() {
    const confirmed = window.confirm(
      "Creare un nuovo progetto? Il progetto corrente è già salvato automaticamente nel browser.",
    );

    if (!confirmed) return;

    setElements([]);
    setSelectedId(null);
    setSelectedIds([]);
    setProjectName("Nuovo progetto");

    historyRef.current = [[]];
    historyIndexRef.current = 0;
    historyInitializedRef.current = true;
  }

  function exportProject() {
    const project = {
      version: 1,
      name: projectName,
      exportedAt: new Date().toISOString(),
      elements,
    };

    const blob = new Blob(
      [JSON.stringify(project, null, 2)],
      { type: "application/json;charset=utf-8" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeName =
      projectName
        .trim()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .toLowerCase() || "template-gfx";

    link.href = url;
    link.download = `${safeName}.template-gfx.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function importProject(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();

      const parsed = JSON.parse(text) as {
        name?: string;
        elements?: CanvasElement[];
      };

      if (!Array.isArray(parsed.elements)) {
        throw new Error("Formato progetto non valido");
      }

      const importedElements = parsed.elements
        .filter(
          (element) =>
            element &&
            typeof element.type === "string" &&
            element.type in defaults,
        )
        .map((element) => ({
          ...defaults[element.type],
          ...element,
          id: element.id || nanoid(),
        }));

      setElements(importedElements);
      setProjectName(parsed.name || "Progetto importato");
      setSelectedId(null);
      setSelectedIds([]);

      historyRef.current = [
        importedElements.map((element) => ({ ...element })),
      ];
      historyIndexRef.current = 0;
      historyInitializedRef.current = true;
    } catch {
      window.alert(
        "Impossibile importare il progetto: file non valido.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function executePreviewAction(
    action: ElementAction,
  ): Promise<boolean> {
    if ((action.delayMs ?? 0) > 0) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, action.delayMs),
      );
    }

    const value = action.value ?? "";
    const target = value
      ? document.getElementById(value)
      : null;

    switch (action.type) {
      case "plugin": {
        if (!action.pluginId || !action.pluginActionId) {
          window.alert(
            "Seleziona un plugin e un comando.",
          );
          return false;
        }

        try {
          const response = await gatewayFetch(
            `${PLUGIN_GATEWAY_URL}/api/execute`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                pluginId: action.pluginId,
                connectionId: action.connectionId,
                actionId: action.pluginActionId,
                options: action.pluginOptions ?? {},
              }),
            },
          );

          const result = (await response.json()) as {
            ok?: boolean;
            error?: string;
          };

          if (!response.ok || !result.ok) {
            throw new Error(
              result.error ?? "Comando plugin fallito",
            );
          }

          window.alert("Comando plugin eseguito.");
          return true;
        } catch (error) {
          window.alert(
            error instanceof Error
              ? error.message
              : "Errore del plugin",
          );
          return false;
        }
      }

      case "alert":
        window.alert(value);
        return true;

      case "confirm":
        return window.confirm(value || "Continuare?");

      case "link":
        window.open(value, "_blank", "noopener,noreferrer");
        return true;

      case "email":
        window.location.href = `mailto:${value}`;
        return true;

      case "phone":
        window.location.href = `tel:${value}`;
        return true;

      case "copy":
        await navigator.clipboard.writeText(value);
        return true;

      case "download": {
        const link = document.createElement("a");
        link.href = value;
        link.download = action.payload ?? "";
        link.click();
        return true;
      }

      case "scroll":
        target?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return true;

      case "show":
        if (target) target.style.display = "";
        return true;

      case "hide":
        if (target) target.style.display = "none";
        return true;

      case "toggle":
        if (target) {
          target.style.display =
            target.style.display === "none" ? "" : "none";
        }
        return true;

      case "setText":
        if (target) {
          target.textContent = action.payload ?? "";
        }
        return true;

      case "api": {
        const method = action.method ?? "GET";

        const response = await fetch(value, {
          method,
          headers:
            method === "GET"
              ? undefined
              : { "Content-Type": "application/json" },
          body:
            method === "GET"
              ? undefined
              : action.payload || undefined,
        });

        window.alert(
          `Risposta API: ${response.status} ${response.statusText}`,
        );
        return response.ok;
      }

      case "submit":
        if (target instanceof HTMLFormElement) {
          target.requestSubmit();
        }
        return true;

      case "play":
        if (target instanceof HTMLMediaElement) {
          await target.play();
        }
        return true;

      case "pause":
        if (target instanceof HTMLMediaElement) {
          target.pause();
        }
        return true;

      case "openModal":
        if (target instanceof HTMLDialogElement) {
          target.showModal();
        }
        return true;

      case "closeModal":
        if (target instanceof HTMLDialogElement) {
          target.close();
        }
        return true;

      case "setStorage":
        window.localStorage.setItem(
          value,
          action.payload ?? "",
        );
        return true;

      case "removeStorage":
        window.localStorage.removeItem(value);
        return true;

      case "customEvent":
        window.dispatchEvent(
          new CustomEvent(value, {
            detail: action.payload,
          }),
        );
        return true;

      case "fullscreen":
        await (target ?? document.documentElement)
          .requestFullscreen?.();
        return true;

      case "back":
        window.alert(
          "Nell'app generata tornerà alla pagina precedente.",
        );
        return true;

      case "reload":
        window.alert(
          "Nell'app generata ricaricherà la pagina.",
        );
        return true;

      case "print":
        window.print();
        return true;
    }
  }

  async function previewButtonActions(
    element: CanvasElement,
  ) {
    const actions = getElementActions(element);

    if (!actions.length) {
      window.alert("Nessuna azione configurata.");
      return;
    }

    for (
      let actionIndex = 0;
      actionIndex < actions.length;
      actionIndex += 1
    ) {
      const action = actions[actionIndex];

      if (action.parallelWithNext) {
        const group = [action];
        let groupIndex = actionIndex;

        while (
          groupIndex < actions.length - 1 &&
          actions[groupIndex].parallelWithNext
        ) {
          groupIndex += 1;
          group.push(actions[groupIndex]);
        }

        const results = await Promise.all(
          group.map((groupAction) =>
            executePreviewAction(groupAction),
          ),
        );

        actionIndex = groupIndex;

        if (results.some((result) => !result)) {
          break;
        }

        continue;
      }

      const shouldContinue =
        await executePreviewAction(action);

      if (!shouldContinue) break;
    }
  }

  function applyPluginPreset(
    actionId: string,
    pluginId: string,
    presetId: string,
  ) {
    const plugin = pluginCatalog.find(
      (item) => item.id === pluginId,
    );

    const preset = plugin?.presets.find(
      (item) => item.id === presetId,
    );

    if (!preset) return;

    updateButtonAction(actionId, {
      pluginActionId: preset.actionId,
      pluginOptions: {
        ...preset.options,
      },
    });
  }

  function updatePluginOption(
    actionId: string,
    fieldId: string,
    value: unknown,
  ) {
    if (!selected) return;

    const action = getElementActions(selected).find(
      (item) => item.id === actionId,
    );

    if (!action) return;

    updateButtonAction(actionId, {
      pluginOptions: {
        ...(action.pluginOptions ?? {}),
        [fieldId]: value,
      },
    });
  }

  function addButtonAction() {
    if (!selected) return;

    updateSelected({
      actions: [
        ...getElementActions(selected),
        {
          id: nanoid(),
          type: "alert",
          value: "Nuova azione",
          method: "GET",
          delayMs: 0,
        },
      ],
    });
  }

  function updateButtonAction(
    actionId: string,
    changes: Partial<ElementAction>,
  ) {
    if (!selected) return;

    updateSelected({
      actions: getElementActions(selected).map((action) =>
        action.id === actionId
          ? { ...action, ...changes }
          : action,
      ),
    });
  }

  function removeButtonAction(actionId: string) {
    if (!selected) return;

    updateSelected({
      actions: getElementActions(selected).filter(
        (action) => action.id !== actionId,
      ),
    });
  }

  function moveButtonAction(
    actionId: string,
    direction: "up" | "down",
  ) {
    if (!selected) return;

    const actions = [...getElementActions(selected)];
    const index = actions.findIndex(
      (action) => action.id === actionId,
    );

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= actions.length
    ) {
      return;
    }

    [actions[index], actions[targetIndex]] = [
      actions[targetIndex],
      actions[index],
    ];

    updateSelected({ actions });
  }

  async function copyCode() {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadCode() {
    const blob = new Blob([generatedCode], {
      type: "text/typescript;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "GeneratedPage.tsx";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveType(null)}
    >
      <main className="min-h-screen min-w-[1100px] bg-slate-950 text-white">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div>
            <h1 className="text-xl font-bold">Template GFX</h1>
            <p className="text-xs text-slate-400">Visual application builder</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-1">
            <input
              value={projectName}
              onChange={(event) =>
                setProjectName(event.target.value)
              }
              className="w-36 rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Nome progetto"
            />

            <button
              type="button"
              onClick={createNewProject}
              className="rounded-lg px-3 py-2 text-sm hover:bg-slate-700"
            >
              Nuovo
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="rounded-lg px-3 py-2 text-sm hover:bg-slate-700"
            >
              Importa
            </button>

            <button
              type="button"
              onClick={exportProject}
              className="rounded-lg px-3 py-2 text-sm hover:bg-slate-700"
            >
              Esporta
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept=".json,.template-gfx.json"
              onChange={importProject}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <button
                key={device}
                type="button"
                onClick={() => setDeviceMode(device)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  deviceMode === device
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {device === "desktop"
                  ? "Desktop"
                  : device === "tablet"
                    ? "Tablet"
                    : "Mobile"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCode(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
          >
            <Code2 className="h-4 w-4" />
            Genera codice
          </button>
        </header>

        <div className="grid h-[calc(100vh-4rem)] grid-cols-[250px_minmax(500px,1fr)_300px]">
          <aside className="overflow-y-auto border-r border-slate-800 p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Componenti
            </h2>

            <div className="space-y-3">
              {palette.map((item) => (
                <PaletteItem key={item.type} {...item} />
              ))}
            </div>

            <div className="mt-8 border-t border-slate-800 pt-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Livelli
              </h2>

              {elements.length === 0 && (
                <p className="text-xs text-slate-500">
                  Nessun elemento presente.
                </p>
              )}

              <div className="space-y-2">
                {[...elements].reverse().map((element) => (
                  <div
                    key={element.id}
                    className={`rounded-lg border p-2 ${
                      selectedIds.includes(element.id)
                        ? "border-blue-500 bg-blue-950/50"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        selectElement(element.id, false)
                      }
                      className="mb-2 w-full truncate text-left text-sm"
                    >
                                            {element.isCanvasBackground
                        ? "Sfondo canvas"
                        : element.text || element.type}
                    </button>

                    <div className="grid grid-cols-6 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          toggleElementVisibility(element.id)
                        }
                        className="rounded bg-slate-700 p-1 text-xs hover:bg-slate-600"
                        title="Mostra o nascondi"
                      >
                        {element.visible === false ? "○" : "●"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleElementLock(element.id)
                        }
                        className="rounded bg-slate-700 p-1 text-xs hover:bg-slate-600"
                        title="Blocca o sblocca"
                      >
                        {element.locked ? "🔒" : "🔓"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveLayer(element.id, "up")
                        }
                        className="rounded bg-slate-700 p-1 text-xs hover:bg-slate-600"
                        title="Porta avanti"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveLayer(element.id, "down")
                        }
                        className="rounded bg-slate-700 p-1 text-xs hover:bg-slate-600"
                        title="Porta indietro"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveLayer(element.id, "front")
                        }
                        className="rounded bg-blue-800 p-1 text-xs hover:bg-blue-700"
                        title="Porta in primo piano"
                      >
                        ⇈
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveLayer(element.id, "back")
                        }
                        className="rounded bg-blue-800 p-1 text-xs hover:bg-blue-700"
                        title="Porta sullo sfondo"
                      >
                        ⇊
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="overflow-auto bg-slate-900 p-8">
            <div
              ref={setNodeRef}
              onClick={() => {
                setSelectedId(null);
                setSelectedIds([]);
              }}
              style={{
                width:
                  deviceMode === "desktop"
                    ? "1180px"
                    : deviceMode === "tablet"
                      ? "768px"
                      : "390px",
                maxWidth: "100%",
              }}
              className={`mx-auto relative grid min-h-[900px] grid-cols-12 auto-rows-[40px] content-start gap-x-6 gap-y-4 rounded-2xl bg-white p-10 text-slate-900 shadow-2xl transition-all duration-300 ${
                isOver ? "ring-4 ring-blue-500" : ""
              }`}
            >
              {elements.length === 0 && (
                <div className="pointer-events-none col-span-12 flex min-h-[500px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-center text-slate-400">
                  <div>
                    <p className="text-lg font-semibold">
                      Trascina qui un componente
                    </p>
                    <p className="text-sm">
                      Seleziona un elemento dalla barra laterale
                    </p>
                  </div>
                </div>
              )}

              {renderedElements.map((element) => (
                <div
                  key={element.id}
                  id={`element-${element.id}`}
                  draggable={element.positionMode !== "absolute" && !element.locked}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (element.locked) return;
                    if (element.positionMode !== "absolute") return;

                    const step = event.shiftKey ? 10 : 1;

                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      moveAbsoluteElement(element.id, -step, 0);
                    }

                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      moveAbsoluteElement(element.id, step, 0);
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveAbsoluteElement(element.id, 0, -step);
                    }

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveAbsoluteElement(element.id, 0, step);
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    setDraggedCanvasId(element.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggedCanvasId(null)}
                  onDragOver={(event) => {
                    if (draggedCanvasId) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderCanvasElement(element.id);
                  }}
                  className={`cursor-move rounded-lg transition ${
                    draggedCanvasId === element.id
                      ? "opacity-40"
                      : "opacity-100"
                  }`}
                  style={{
                    display:
                      element.visible === false ? "none" : undefined,
                    pointerEvents:
                      element.isCanvasBackground || element.locked
                        ? "none"
                        : undefined,
                    position:
                      element.isCanvasBackground
                        ? "absolute"
                        : element.positionMode === "absolute"
                          ? "absolute"
                          : "relative",
                    left:
                      element.isCanvasBackground
                        ? 0
                        : element.positionMode === "absolute"
                          ? element.x ?? 0
                          : undefined,
                    top:
                      element.isCanvasBackground
                        ? 0
                        : element.positionMode === "absolute"
                          ? element.y ?? 0
                          : undefined,
                    width:
                      element.isCanvasBackground
                        ? "100%"
                        : element.positionMode === "absolute"
                          ? element.widthPx ?? 320
                          : undefined,
                    height:
                      element.isCanvasBackground
                        ? "100%"
                        : element.positionMode === "absolute"
                          ? element.heightPx ?? 120
                          : undefined,
                    gridColumn:
                      element.positionMode === "absolute"
                        ? undefined
                        : (element.gridColumnStart ?? 0) > 0
                          ? `${element.gridColumnStart} / span ${
                              element.gridColumnSpan ?? 12
                            }`
                          : `span ${element.gridColumnSpan ?? 12}`,
                    gridRow:
                      element.positionMode === "absolute"
                        ? undefined
                        : (element.gridRowStart ?? 0) > 0
                          ? `${element.gridRowStart} / span ${
                              element.gridRowSpan ?? 3
                            }`
                          : `span ${element.gridRowSpan ?? 3}`,
                    textAlign: element.alignment ?? "left",
                    boxSizing: "border-box",
                    backgroundImage: element.backgroundImage
                      ? `url(${element.backgroundImage})`
                      : undefined,
                    backgroundSize:
                      element.backgroundSize === "stretch"
                        ? "100% 100%"
                        : element.backgroundSize ?? "cover",
                    backgroundPosition:
                      element.backgroundPosition ?? "center",
                    backgroundRepeat: "no-repeat",
                    borderStyle:
                      (element.borderWidth ?? 0) > 0
                        ? "solid"
                        : undefined,
                    borderWidth: element.borderWidth ?? 0,
                    borderColor:
                      element.borderColor ?? "#0f172a",
                                        borderRadius:
                      element.type === "shape" &&
                      element.shapeType === "ellipse"
                        ? "50%"
                        : element.borderRadius ?? 0,
                    opacity: (element.opacity ?? 100) / 100,
                    transform: `rotate(${element.rotation ?? 0}deg)`,
                    boxShadow:
                      element.shadow === "small"
                        ? "0 2px 8px rgba(15, 23, 42, 0.18)"
                        : element.shadow === "medium"
                          ? "0 8px 24px rgba(15, 23, 42, 0.24)"
                          : element.shadow === "large"
                            ? "0 18px 50px rgba(15, 23, 42, 0.32)"
                            : "none",
                    zIndex: element.isCanvasBackground
                      ? 0
                      : Math.max(1, element.zIndex ?? 1),
                    overflow:
                      Boolean(element.backgroundImage) ||
                      element.type === "image" ||
                      (
                        element.type === "shape" &&
                        element.shapeType === "ellipse"
                      )
                        ? "hidden"
                        : element.positionMode === "absolute"
                          ? "auto"
                          : undefined,
                  }}
                >
                  <CanvasItem
                    element={element}
                    selected={selectedIds.includes(element.id)}
                    onSelect={(additive) => selectElement(element.id, additive)}
                  />
                </div>
              ))}
            </div>
          </section>

          <aside className="overflow-y-auto border-l border-slate-800 p-5">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-400">
              ProprietÃ 
            </h2>

            {selectedIds.length > 1 && (
              <div className="mb-5 rounded-xl border border-blue-700 bg-blue-950/40 p-3">
                <p className="mb-1 text-sm font-semibold">
                  {selectedIds.length} elementi selezionati
                </p>

                <p className="mb-3 text-xs text-slate-400">
                  Per una distribuzione visibile seleziona almeno tre elementi.
                </p>

                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  Allinea
                </p>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["left", "← Sinistra"],
                      ["center", "↔ Centro"],
                      ["right", "Destra →"],
                      ["top", "↑ Alto"],
                      ["middle", "↕ Centro"],
                      ["bottom", "Basso ↓"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => alignSelected(mode)}
                      className="rounded-lg bg-slate-700 px-2 py-2 text-xs hover:bg-slate-600"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  Distribuisci spazi
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={selectedIds.length < 3}
                    onClick={() =>
                      distributeSelected("horizontal")
                    }
                    className="rounded-lg bg-blue-700 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Distribuisci ↔
                  </button>

                  <button
                    type="button"
                    disabled={selectedIds.length < 3}
                    onClick={() =>
                      distributeSelected("vertical")
                    }
                    className="rounded-lg bg-blue-700 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Distribuisci ↕
                  </button>
                </div>
              </div>
            )}

            {!selected && (
              <p className="text-sm text-slate-500">
                Seleziona un elemento nel canvas.
              </p>
            )}

            {selected && (
              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-green-700 bg-green-950/30 p-3">
                  <div>
                    <p className="font-semibold text-white">
                      Feedback plugin
                    </p>
                    <p className="text-xs text-slate-400">
                      Configura colori e testo dinamici
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateElementFeedback({
                        enabled:
                          !(selected.feedback?.enabled ?? false),
                      })
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      selected.feedback?.enabled
                        ? "bg-green-600"
                        : "bg-slate-700"
                    }`}
                  >
                    {selected.feedback?.enabled
                      ? "Attivo"
                      : "Attiva"}
                  </button>
                </div>
                {selected.type === "shape" && (
                  <div className="space-y-4 rounded-xl border border-cyan-700 bg-cyan-950/20 p-4">
                    <h3 className="font-semibold text-white">
                      Proprietà forma
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["rectangle", "Rettangolo"],
                          ["ellipse", "Ellisse"],
                          ["line", "Linea"],
                        ] as const
                      ).map(([shapeType, label]) => (
                        <button
                          key={shapeType}
                          type="button"
                          onClick={() =>
                            updateSelected({ shapeType })
                          }
                          className={`rounded-lg px-2 py-2 text-xs ${
                            selected.shapeType === shapeType
                              ? "bg-cyan-600"
                              : "bg-slate-700 hover:bg-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        Colore riempimento
                      </span>
                      <input
                        type="color"
                        value={selected.background}
                        onChange={(event) =>
                          updateSelected({
                            background: event.target.value,
                          })
                        }
                        className="h-10 w-16"
                      />
                    </label>

                    {selected.shapeType === "line" && (
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-400">
                          Spessore: {selected.shapeThickness ?? 4}px
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={selected.shapeThickness ?? 4}
                          onChange={(event) =>
                            updateSelected({
                              shapeThickness: Number(
                                event.target.value,
                              ),
                            })
                          }
                          className="w-full"
                        />
                      </label>
                    )}
                  </div>
                )}

                {selected.type === "image" && (
                  <div className="space-y-4 rounded-xl border border-purple-700 bg-purple-950/30 p-4">
                    <h3 className="font-semibold text-white">
                      Proprietà immagine
                    </h3>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        URL immagine
                      </span>
                      <input
                        type="text"
                        value={selected.imageSrc ?? ""}
                        onChange={(event) =>
                          updateSelected({
                            imageSrc: event.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Carica dal computer
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            handleImageUpload(file);
                          }

                          event.target.value = "";
                        }}
                        className="block w-full text-xs text-slate-400"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Adattamento
                      </span>
                      <select
                        value={selected.objectFit ?? "cover"}
                        onChange={(event) =>
                          updateSelected({
                            objectFit: event.target.value as
                              | "cover"
                              | "contain"
                              | "fill",
                          })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                      >
                        <option value="cover">Riempi e ritaglia</option>
                        <option value="contain">Mostra intera</option>
                        <option value="fill">Adatta al riquadro</option>
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Angoli: {selected.borderRadius ?? 12}px
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selected.borderRadius ?? 12}
                        onChange={(event) =>
                          updateSelected({
                            borderRadius: Number(
                              event.target.value,
                            ),
                          })
                        }
                        className="w-full"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Opacità: {selected.opacity ?? 100}%
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selected.opacity ?? 100}
                        onChange={(event) =>
                          updateSelected({
                            opacity: Number(event.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </label>

                    {selected.isCanvasBackground ? (
                      <button
                        type="button"
                        onClick={() =>
                          removeCanvasBackground(selected.id)
                        }
                        className="w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold hover:bg-amber-600"
                      >
                        Rimuovi come sfondo canvas
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!selected.imageSrc}
                        onClick={() =>
                          setCanvasBackground(selected.id)
                        }
                        className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Usa come sfondo canvas
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({ imageSrc: "" })
                      }
                      className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600"
                    >
                      Rimuovi immagine
                    </button>
                  </div>
                )}

                {selected.type === "button" && (
                  <div className="space-y-4 rounded-xl border border-indigo-700 bg-indigo-950/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">
                          Action Builder
                        </h3>
                        <p className="text-xs text-slate-400">
                          Le azioni vengono eseguite dall'alto verso il basso.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addButtonAction}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500"
                      >
                        + Azione
                      </button>
                    </div>

                    {getElementActions(selected).length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-sm text-slate-500">
                        Nessuna azione configurata.
                      </p>
                    )}

                    {getElementActions(selected).map(
                      (action, actionIndex) => (
                        <div
                          key={action.id}
                          className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-indigo-300">
                              Azione {actionIndex + 1}
                            </span>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  moveButtonAction(
                                    action.id,
                                    "up",
                                  )
                                }
                                className="rounded bg-slate-700 px-2 py-1 text-xs"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveButtonAction(
                                    action.id,
                                    "down",
                                  )
                                }
                                className="rounded bg-slate-700 px-2 py-1 text-xs"
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  removeButtonAction(action.id)
                                }
                                className="rounded bg-red-700 px-2 py-1 text-xs"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <select
                            value={action.type}
                            onChange={(event) =>
                              updateButtonAction(action.id, {
                                type: event.target
                                  .value as ActionType,
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
                          >
                            {actionOptions.map((option) => (
                              <option
                                key={option.type}
                                value={option.type}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {action.type === "plugin" && (
                            <div className="space-y-3 rounded-lg border border-violet-700 bg-violet-950/30 p-3">
                              <div
                                className={`rounded-lg px-3 py-2 text-xs ${
                                  pluginGatewayOnline
                                    ? "bg-emerald-950 text-emerald-300"
                                    : "bg-red-950 text-red-300"
                                }`}
                              >
                                Gateway plugin:{" "}
                                {pluginGatewayOnline
                                  ? "connesso"
                                  : "non disponibile"}
                              </div>

                              <label className="block text-sm">
                                <span className="mb-1 block text-slate-400">
                                  Plugin
                                </span>

                                <select
                                  value={action.pluginId ?? ""}
                                  onChange={(event) =>
                                    updateButtonAction(
                                      action.id,
                                      {
                                        pluginId:
                                          event.target.value,
                                        connectionId: "",
                                        pluginActionId: "",
                                        pluginOptions: {},
                                      },
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                                >
                                  <option value="">
                                    Seleziona plugin
                                  </option>

                                  {pluginCatalog.map((plugin) => (
                                    <option
                                      key={plugin.id}
                                      value={plugin.id}
                                    >
                                      {plugin.name} v
                                      {plugin.version}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <div className="space-y-2">
                                <label className="block text-sm">
                                  <span className="mb-1 block text-slate-400">
                                    Connessione
                                  </span>

                                  <select
                                    value={
                                      action.connectionId ?? ""
                                    }
                                    onChange={(event) =>
                                      updateButtonAction(
                                        action.id,
                                        {
                                          connectionId:
                                            event.target.value,
                                        },
                                      )
                                    }
                                    disabled={!action.pluginId}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 disabled:opacity-50"
                                  >
                                    <option value="">
                                      Seleziona connessione
                                    </option>

                                    {pluginConnections
                                      .filter(
                                        (connection) =>
                                          connection.pluginId ===
                                          action.pluginId,
                                      )
                                      .map((connection) => (
                                        <option
                                          key={connection.id}
                                          value={connection.id}
                                        >
                                          {connection.name}
                                        </option>
                                      ))}
                                  </select>
                                </label>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openConnectionManager(
                                      action.pluginId,
                                    )
                                  }
                                  className="w-full rounded-lg bg-violet-700 px-3 py-2 text-sm hover:bg-violet-600"
                                >
                                  Gestisci connessioni
                                </button>
                              </div>

                              {(
                                pluginCatalog.find(
                                  (plugin) =>
                                    plugin.id ===
                                    action.pluginId,
                                )?.presets.length ?? 0
                              ) > 0 && (
                                <label className="block text-sm">
                                  <span className="mb-1 block text-slate-400">
                                    Preset
                                  </span>

                                  <select
                                    defaultValue=""
                                    onChange={(event) => {
                                      applyPluginPreset(
                                        action.id,
                                        action.pluginId ?? "",
                                        event.target.value,
                                      );

                                      event.target.value = "";
                                    }}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                                  >
                                    <option value="">
                                      Carica preset
                                    </option>

                                    {pluginCatalog
                                      .find(
                                        (plugin) =>
                                          plugin.id ===
                                          action.pluginId,
                                      )
                                      ?.presets.map((preset) => (
                                        <option
                                          key={preset.id}
                                          value={preset.id}
                                        >
                                          {preset.category} —{" "}
                                          {preset.name}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                              )}

                              <label className="block text-sm">
                                <span className="mb-1 block text-slate-400">
                                  Comando
                                </span>

                                <select
                                  value={
                                    action.pluginActionId ?? ""
                                  }
                                  onChange={(event) =>
                                    updateButtonAction(
                                      action.id,
                                      {
                                        pluginActionId:
                                          event.target.value,
                                        pluginOptions: {},
                                      },
                                    )
                                  }
                                  disabled={!action.pluginId}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 disabled:opacity-50"
                                >
                                  <option value="">
                                    Seleziona comando
                                  </option>

                                  {pluginCatalog
                                    .find(
                                      (plugin) =>
                                        plugin.id ===
                                        action.pluginId,
                                    )
                                    ?.actions.map(
                                      (pluginAction) => (
                                        <option
                                          key={pluginAction.id}
                                          value={
                                            pluginAction.id
                                          }
                                        >
                                          {pluginAction.name}
                                        </option>
                                      ),
                                    )}
                                </select>
                              </label>

                              {pluginCatalog
                                .find(
                                  (plugin) =>
                                    plugin.id ===
                                    action.pluginId,
                                )
                                ?.actions.find(
                                  (pluginAction) =>
                                    pluginAction.id ===
                                    action.pluginActionId,
                                )
                                ?.fields.map((field) => (
                                  <label
                                    key={field.id}
                                    className="block text-sm"
                                  >
                                    <span className="mb-1 block text-slate-400">
                                      {field.label}
                                      {field.required ? " *" : ""}
                                    </span>

                                    {field.type === "select" ? (
                                      <select
                                        value={String(
                                          action
                                            .pluginOptions?.[
                                            field.id
                                          ] ??
                                            field.defaultValue ??
                                            "",
                                        )}
                                        onChange={(event) =>
                                          updatePluginOption(
                                            action.id,
                                            field.id,
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                                      >
                                        {field.choices?.map(
                                          (choice) => (
                                            <option
                                              key={choice.id}
                                              value={choice.id}
                                            >
                                              {choice.label}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    ) : field.type ===
                                      "boolean" ? (
                                      <input
                                        type="checkbox"
                                        checked={Boolean(
                                          action
                                            .pluginOptions?.[
                                            field.id
                                          ] ??
                                            field.defaultValue ??
                                            false,
                                        )}
                                        onChange={(event) =>
                                          updatePluginOption(
                                            action.id,
                                            field.id,
                                            event.target.checked,
                                          )
                                        }
                                        className="h-4 w-4"
                                      />
                                    ) : field.type ===
                                      "textarea" ? (
                                      <textarea
                                        value={String(
                                          action
                                            .pluginOptions?.[
                                            field.id
                                          ] ??
                                            field.defaultValue ??
                                            "",
                                        )}
                                        onChange={(event) =>
                                          updatePluginOption(
                                            action.id,
                                            field.id,
                                            event.target.value,
                                          )
                                        }
                                        className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                                      />
                                    ) : (
                                      <input
                                        type={field.type}
                                        value={String(
                                          action
                                            .pluginOptions?.[
                                            field.id
                                          ] ??
                                            field.defaultValue ??
                                            "",
                                        )}
                                        onChange={(event) =>
                                          updatePluginOption(
                                            action.id,
                                            field.id,
                                            field.type ===
                                              "number"
                                              ? Number(
                                                  event.target
                                                    .value,
                                                )
                                              : event.target
                                                  .value,
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                                      />
                                    )}
                                  </label>
                                ))}
                            </div>
                          )}

                          {targetActionTypes.includes(
                            action.type,
                          ) ? (
                            <label className="block text-sm">
                              <span className="mb-1 block text-slate-400">
                                Elemento destinazione
                              </span>
                              <select
                                value={action.value ?? ""}
                                onChange={(event) =>
                                  updateButtonAction(
                                    action.id,
                                    {
                                      value:
                                        event.target.value,
                                    },
                                  )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                              >
                                <option value="">
                                  Seleziona elemento
                                </option>

                                {renderedElements.map((element) => (
                                  <option
                                    key={element.id}
                                    value={`element-${element.id}`}
                                  >
                                    {element.text ||
                                      element.type}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : ![
                              "back",
                              "reload",
                              "print",
                              "plugin",
                            ].includes(action.type) ? (
                            <label className="block text-sm">
                              <span className="mb-1 block text-slate-400">
                                Valore
                              </span>
                              <input
                                type="text"
                                value={action.value ?? ""}
                                onChange={(event) =>
                                  updateButtonAction(
                                    action.id,
                                    {
                                      value:
                                        event.target.value,
                                    },
                                  )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                              />
                            </label>
                          ) : null}

                          {action.type === "api" && (
                            <select
                              value={action.method ?? "GET"}
                              onChange={(event) =>
                                updateButtonAction(action.id, {
                                  method: event.target
                                    .value as ElementAction["method"],
                                })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="PATCH">PATCH</option>
                              <option value="DELETE">
                                DELETE
                              </option>
                            </select>
                          )}

                          {[
                            "api",
                            "setText",
                            "setStorage",
                            "customEvent",
                            "download",
                          ].includes(action.type) && (
                            <label className="block text-sm">
                              <span className="mb-1 block text-slate-400">
                                Dati aggiuntivi
                              </span>
                              <textarea
                                value={action.payload ?? ""}
                                onChange={(event) =>
                                  updateButtonAction(
                                    action.id,
                                    {
                                      payload:
                                        event.target.value,
                                    },
                                  )
                                }
                                className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                              />
                            </label>
                          )}

                          <label className="block text-sm">
                            <span className="mb-1 block text-slate-400">
                              Ritardo: {action.delayMs ?? 0} ms
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={action.delayMs ?? 0}
                              onChange={(event) =>
                                updateButtonAction(action.id, {
                                  delayMs: Math.max(
                                    0,
                                    Number(
                                      event.target.value,
                                    ),
                                  ),
                                })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                            />
                          </label>

                          <label className="flex items-center gap-3 rounded-lg border border-cyan-800 bg-cyan-950/30 p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                action.parallelWithNext ??
                                false
                              }
                              onChange={(event) =>
                                updateButtonAction(action.id, {
                                  parallelWithNext:
                                    event.target.checked,
                                })
                              }
                              className="h-4 w-4"
                            />

                            <span>
                              Esegui insieme all’azione successiva
                            </span>
                          </label>
                        </div>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        previewButtonActions(selected)
                      }
                      className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-semibold hover:bg-indigo-500"
                    >
                      Prova sequenza
                    </button>
                  </div>
                )}

                {selected.type !== "image" && selected.type !== "shape" && (
                  <div className="space-y-4 rounded-xl border border-pink-700 bg-pink-950/20 p-4">
                    <h3 className="font-semibold text-white">
                      Immagine di sfondo
                    </h3>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        URL
                      </span>
                      <input
                        type="text"
                        value={selected.backgroundImage ?? ""}
                        onChange={(event) =>
                          updateSelected({
                            backgroundImage: event.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Carica dal computer
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            handleBackgroundImageUpload(file);
                          }

                          event.target.value = "";
                        }}
                        className="block w-full text-xs text-slate-400"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Adattamento
                        </span>
                        <select
                          value={selected.backgroundSize ?? "cover"}
                          onChange={(event) =>
                            updateSelected({
                              backgroundSize: event.target.value as
                                | "cover"
                                | "contain"
                                | "stretch",
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        >
                          <option value="cover">Riempi</option>
                          <option value="contain">Contieni</option>
                          <option value="stretch">Allunga</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Posizione
                        </span>
                        <select
                          value={
                            selected.backgroundPosition ?? "center"
                          }
                          onChange={(event) =>
                            updateSelected({
                              backgroundPosition:
                                event.target.value as
                                  | "center"
                                  | "top"
                                  | "bottom"
                                  | "left"
                                  | "right",
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        >
                          <option value="center">Centro</option>
                          <option value="top">Alto</option>
                          <option value="bottom">Basso</option>
                          <option value="left">Sinistra</option>
                          <option value="right">Destra</option>
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({
                          backgroundImage: "",
                        })
                      }
                      className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600"
                    >
                      Rimuovi sfondo
                    </button>
                  </div>
                )}

                {selected.type !== "image" && (
                  <div className="space-y-4 rounded-xl border border-amber-700 bg-amber-950/20 p-4">
                    <h3 className="font-semibold text-white">
                      Tipografia
                    </h3>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Carattere
                      </span>
                      <select
                        value={
                          selected.fontFamily ??
                          "Arial, Helvetica, sans-serif"
                        }
                        onChange={(event) =>
                          updateSelected({
                            fontFamily: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                      >
                        <option value="Arial, Helvetica, sans-serif">
                          Arial
                        </option>
                        <option value="Verdana, Geneva, sans-serif">
                          Verdana
                        </option>
                        <option value="Georgia, serif">
                          Georgia
                        </option>
                        <option value="'Times New Roman', serif">
                          Times New Roman
                        </option>
                        <option value="'Courier New', monospace">
                          Courier New
                        </option>
                        <option value="system-ui, sans-serif">
                          Sistema
                        </option>
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Peso
                      </span>
                      <select
                        value={selected.fontWeight ?? 400}
                        onChange={(event) =>
                          updateSelected({
                            fontWeight: Number(
                              event.target.value,
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                      >
                        <option value="300">Leggero</option>
                        <option value="400">Normale</option>
                        <option value="500">Medio</option>
                        <option value="600">Semibold</option>
                        <option value="700">Grassetto</option>
                        <option value="800">Extra bold</option>
                        <option value="900">Nero</option>
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateSelected({
                            fontStyle:
                              selected.fontStyle === "italic"
                                ? "normal"
                                : "italic",
                          })
                        }
                        className={`rounded-lg px-3 py-2 text-sm italic ${
                          selected.fontStyle === "italic"
                            ? "bg-amber-600"
                            : "bg-slate-700"
                        }`}
                      >
                        Corsivo
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateSelected({
                            textDecoration:
                              selected.textDecoration === "underline"
                                ? "none"
                                : "underline",
                          })
                        }
                        className={`rounded-lg px-3 py-2 text-sm underline ${
                          selected.textDecoration === "underline"
                            ? "bg-amber-600"
                            : "bg-slate-700"
                        }`}
                      >
                        Sottolineato
                      </button>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Spaziatura: {selected.letterSpacing ?? 0}px
                      </span>
                      <input
                        type="range"
                        min="-2"
                        max="12"
                        step="0.5"
                        value={selected.letterSpacing ?? 0}
                        onChange={(event) =>
                          updateSelected({
                            letterSpacing: Number(
                              event.target.value,
                            ),
                          })
                        }
                        className="w-full"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-400">
                        Altezza linea: {selected.lineHeight ?? 1.2}
                      </span>
                      <input
                        type="range"
                        min="0.8"
                        max="3"
                        step="0.1"
                        value={selected.lineHeight ?? 1.2}
                        onChange={(event) =>
                          updateSelected({
                            lineHeight: Number(
                              event.target.value,
                            ),
                          })
                        }
                        className="w-full"
                      />
                    </label>
                  </div>
                )}

                <div className="space-y-4 rounded-xl border border-emerald-700 bg-emerald-950/20 p-4">
                  <h3 className="font-semibold text-white">
                    Aspetto
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-400">
                        Bordo px
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={selected.borderWidth ?? 0}
                        onChange={(event) =>
                          updateSelected({
                            borderWidth: Math.max(
                              0,
                              Number(event.target.value),
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-slate-400">
                        Colore bordo
                      </span>
                      <input
                        type="color"
                        value={selected.borderColor ?? "#0f172a"}
                        onChange={(event) =>
                          updateSelected({
                            borderColor: event.target.value,
                          })
                        }
                        className="h-10 w-full rounded"
                      />
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-400">
                      Angoli: {selected.borderRadius ?? 0}px
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      value={selected.borderRadius ?? 0}
                      onChange={(event) =>
                        updateSelected({
                          borderRadius: Number(
                            event.target.value,
                          ),
                        })
                      }
                      className="w-full"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-400">
                      Opacità: {selected.opacity ?? 100}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selected.opacity ?? 100}
                      onChange={(event) =>
                        updateSelected({
                          opacity: Number(event.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-400">
                      Rotazione: {selected.rotation ?? 0}°
                    </span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selected.rotation ?? 0}
                      onChange={(event) =>
                        updateSelected({
                          rotation: Number(event.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-400">
                      Ombra
                    </span>
                    <select
                      value={selected.shadow ?? "none"}
                      onChange={(event) =>
                        updateSelected({
                          shadow: event.target.value as
                            | "none"
                            | "small"
                            | "medium"
                            | "large",
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                    >
                      <option value="none">Nessuna</option>
                      <option value="small">Piccola</option>
                      <option value="medium">Media</option>
                      <option value="large">Grande</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-4 rounded-xl border border-green-700 bg-green-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        Feedback plugin
                      </h3>
                      <p className="text-xs text-slate-400">
                        WebSocket:{" "}
                        {pluginSocketOnline
                          ? "connesso"
                          : "disconnesso"}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={selected.feedback?.enabled ?? false}
                      onChange={(event) =>
                        updateElementFeedback({
                          enabled: event.target.checked,
                        })
                      }
                      className="h-5 w-5"
                    />
                  </div>

                  {selected.feedback?.enabled && (
                    <>
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-400">
                          Plugin
                        </span>
                        <select
                          value={selected.feedback.pluginId}
                          onChange={(event) =>
                            updateElementFeedback({
                              pluginId: event.target.value,
                              variableId: "",
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
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

                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-400">
                          Variabile
                        </span>
                        <select
                          value={selected.feedback.variableId}
                          onChange={(event) =>
                            updateElementFeedback({
                              variableId: event.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        >
                          <option value="">
                            Seleziona variabile
                          </option>

                          {pluginCatalog
                            .find(
                              (plugin) =>
                                plugin.id ===
                                selected.feedback?.pluginId,
                            )
                            ?.variables.map((variable) => (
                              <option
                                key={variable.id}
                                value={variable.id}
                              >
                                {variable.name}
                              </option>
                            ))}
                        </select>
                      </label>

                      <div className="rounded-lg bg-slate-950 p-2 text-xs text-emerald-300">
                        Valore attuale:{" "}
                        {String(
                          pluginVariables[
                            `${selected.feedback.pluginId}:${selected.feedback.variableId}`
                          ] ?? "",
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm">
                          <span className="mb-1 block text-slate-400">
                            Condizione
                          </span>
                          <select
                            value={selected.feedback.operator}
                            onChange={(event) =>
                              updateElementFeedback({
                                operator: event.target.value as
                                  ElementFeedback["operator"],
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                          >
                            <option value="equals">Uguale</option>
                            <option value="notEquals">
                              Diverso
                            </option>
                            <option value="contains">
                              Contiene
                            </option>
                            <option value="truthy">
                              Vero/attivo
                            </option>
                          </select>
                        </label>

                        <label className="text-sm">
                          <span className="mb-1 block text-slate-400">
                            Valore atteso
                          </span>
                          <input
                            value={
                              selected.feedback.expectedValue
                            }
                            disabled={
                              selected.feedback.operator ===
                              "truthy"
                            }
                            onChange={(event) =>
                              updateElementFeedback({
                                expectedValue:
                                  event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 disabled:opacity-40"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm">
                          <span className="mb-1 block text-slate-400">
                            Colore sfondo
                          </span>
                          <input
                            type="color"
                            value={
                              selected.feedback
                                .activeBackground
                            }
                            onChange={(event) =>
                              updateElementFeedback({
                                activeBackground:
                                  event.target.value,
                              })
                            }
                            className="h-10 w-full"
                          />
                        </label>

                        <label className="text-sm">
                          <span className="mb-1 block text-slate-400">
                            Colore testo
                          </span>
                          <input
                            type="color"
                            value={
                              selected.feedback.activeColor
                            }
                            onChange={(event) =>
                              updateElementFeedback({
                                activeColor:
                                  event.target.value,
                              })
                            }
                            className="h-10 w-full"
                          />
                        </label>
                      </div>

                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-400">
                          Testo quando attivo
                        </span>
                        <input
                          value={selected.feedback.activeText}
                          onChange={(event) =>
                            updateElementFeedback({
                              activeText: event.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        />
                      </label>

                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-400">
                          Visibilità
                        </span>
                        <select
                          value={selected.feedback.visibility}
                          onChange={(event) =>
                            updateElementFeedback({
                              visibility:
                                event.target.value as
                                  ElementFeedback["visibility"],
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        >
                          <option value="unchanged">
                            Non modificare
                          </option>
                          <option value="show">Mostra</option>
                          <option value="hide">Nascondi</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-blue-700 bg-blue-950/30 p-4">
                  <h3 className="mb-3 font-semibold text-white">
                    Dimensioni elemento
                  </h3>

                  {selected.positionMode === "absolute" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Larghezza px
                        </span>
                        <input
                          type="number"
                          min="20"
                          value={selected.widthPx ?? 320}
                          onChange={(event) =>
                            updateSelected({
                              widthPx: Math.max(
                                20,
                                Number(event.target.value),
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Altezza px
                        </span>
                        <input
                          type="number"
                          min="20"
                          value={selected.heightPx ?? 120}
                          onChange={(event) =>
                            updateSelected({
                              heightPx: Math.max(
                                20,
                                Number(event.target.value),
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Larghezza colonne
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={selected.gridColumnSpan ?? 12}
                          onChange={(event) =>
                            updateSelected({
                              gridColumnSpan: Math.max(
                                1,
                                Math.min(
                                  12,
                                  Number(event.target.value),
                                ),
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Altezza righe
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={selected.gridRowSpan ?? 3}
                          onChange={(event) =>
                            updateSelected({
                              gridRowSpan: Math.max(
                                1,
                                Math.min(
                                  20,
                                  Number(event.target.value),
                                ),
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"
                        />
                      </label>
                    </div>
                  )}
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Contenuto
                  </span>
                  <textarea
                    value={selected.text}
                    onChange={(event) =>
                      updateSelected({ text: event.target.value })
                    }
                    className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Dimensione testo: {selected.fontSize}px
                  </span>
                  <input
                    type="range"
                    min="12"
                    max="80"
                    value={selected.fontSize}
                    onChange={(event) =>
                      updateSelected({ fontSize: Number(event.target.value) })
                    }
                    className="w-full"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-sm text-slate-300">
                    Posizionamento
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({ positionMode: "grid" })
                      }
                      className={`rounded-lg px-3 py-2 text-sm ${
                        selected.positionMode !== "absolute"
                          ? "bg-blue-600"
                          : "bg-slate-700"
                      }`}
                    >
                      Griglia
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({ positionMode: "absolute" })
                      }
                      className={`rounded-lg px-3 py-2 text-sm ${
                        selected.positionMode === "absolute"
                          ? "bg-blue-600"
                          : "bg-slate-700"
                      }`}
                    >
                      Libera
                    </button>
                  </div>
                </div>

                {selected.positionMode === "absolute" && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-700 p-3">
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-400">
                        X
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={selected.x ?? 0}
                        onChange={(event) =>
                          updateSelected({
                            x: Number(event.target.value),
                          })
                        }
                        className="w-full rounded bg-slate-900 p-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-slate-400">
                        Y
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={selected.y ?? 0}
                        onChange={(event) =>
                          updateSelected({
                            y: Number(event.target.value),
                          })
                        }
                        className="w-full rounded bg-slate-900 p-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-slate-400">
                        Larghezza px
                      </span>
                      <input
                        type="number"
                        min="20"
                        value={selected.widthPx ?? 320}
                        onChange={(event) =>
                          updateSelected({
                            widthPx: Number(event.target.value),
                          })
                        }
                        className="w-full rounded bg-slate-900 p-2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block text-slate-400">
                        Altezza px
                      </span>
                      <input
                        type="number"
                        min="20"
                        value={selected.heightPx ?? 120}
                        onChange={(event) =>
                          updateSelected({
                            heightPx: Number(event.target.value),
                          })
                        }
                        className="w-full rounded bg-slate-900 p-2"
                      />
                    </label>
                  </div>
                )}

                {selected.positionMode !== "absolute" && (
                  <div className="rounded-xl border border-slate-700 p-3">
                    <p className="mb-3 text-sm font-semibold text-slate-300">
                      Posizione precisa nella griglia
                    </p>

                    <p className="mb-3 text-xs text-slate-500">
                      Colonna o riga a 0 significa posizionamento automatico.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Colonna
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="12"
                          value={selected.gridColumnStart ?? 0}
                          onChange={(event) =>
                            updateSelected({
                              gridColumnStart: Number(
                                event.target.value,
                              ),
                            })
                          }
                          className="w-full rounded bg-slate-900 p-2"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Larghezza colonne
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={selected.gridColumnSpan ?? 12}
                          onChange={(event) =>
                            updateSelected({
                              gridColumnSpan: Number(
                                event.target.value,
                              ),
                            })
                          }
                          className="w-full rounded bg-slate-900 p-2"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Riga
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={selected.gridRowStart ?? 0}
                          onChange={(event) =>
                            updateSelected({
                              gridRowStart: Number(
                                event.target.value,
                              ),
                            })
                          }
                          className="w-full rounded bg-slate-900 p-2"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-1 block text-slate-400">
                          Altezza righe
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={selected.gridRowSpan ?? 3}
                          onChange={(event) =>
                            updateSelected({
                              gridRowSpan: Number(
                                event.target.value,
                              ),
                            })
                          }
                          className="w-full rounded bg-slate-900 p-2"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Larghezza: {selected.width ?? 100}%
                  </span>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={selected.width ?? 100}
                    onChange={(event) =>
                      updateSelected({
                        width: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-sm text-slate-300">
                    Allineamento
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {(["left", "center", "right"] as const).map(
                      (alignment) => (
                        <button
                          key={alignment}
                          type="button"
                          onClick={() => updateSelected({ alignment })}
                          className={`rounded-lg px-2 py-2 text-sm ${
                            selected.alignment === alignment
                              ? "bg-blue-600"
                              : "bg-slate-700 hover:bg-slate-600"
                          }`}
                        >
                          {alignment === "left"
                            ? "Sinistra"
                            : alignment === "center"
                              ? "Centro"
                              : "Destra"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Colore testo</span>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(event) =>
                      updateSelected({ color: event.target.value })
                    }
                    className="h-10 w-16"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Sfondo</span>
                  <input
                    type="color"
                    value={
                      selected.background === "transparent"
                        ? "#ffffff"
                        : selected.background
                    }
                    onChange={(event) =>
                      updateSelected({ background: event.target.value })
                    }
                    className="h-10 w-16"
                  />
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => moveSelected("up")}
                    className="rounded-lg bg-slate-700 px-2 py-2 text-sm hover:bg-slate-600"
                  >
                    ↑ Su
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSelected("down")}
                    className="rounded-lg bg-slate-700 px-2 py-2 text-sm hover:bg-slate-600"
                  >
                    ↓ Giù
                  </button>

                  <button
                    type="button"
                    onClick={duplicateSelected}
                    className="rounded-lg bg-blue-700 px-2 py-2 text-sm hover:bg-blue-600"
                  >
                    Duplica
                  </button>
                </div>

                <button
                  onClick={deleteSelected}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina elemento
                </button>
              </div>
            )}
          </aside>
        </div>

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

        {showCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
            <div className="flex h-[80vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Codice React generato</h2>

                <button
                  onClick={() => setShowCode(false)}
                  className="rounded-lg bg-slate-700 px-4 py-2"
                >
                  Chiudi
                </button>
              </div>

              <textarea
                readOnly
                value={generatedCode}
                className="flex-1 resize-none rounded-xl bg-slate-950 p-5 font-mono text-sm text-emerald-400"
              />

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiato" : "Copia"}
                </button>

                <button
                  onClick={downloadCode}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold"
                >
                  <Download className="h-4 w-4" />
                  Scarica file
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <DragOverlay>
        {activeType && (
          <div className="rounded-lg bg-blue-600 px-5 py-3 font-semibold shadow-xl">
            {palette.find((item) => item.type === activeType)?.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}






























