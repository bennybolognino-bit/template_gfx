import { getElementActions } from "./helpers";
import type { CanvasElement } from "./types";
export function generateCode(elements: CanvasElement[]) {
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

const GENERATED_FEEDBACKS = ${JSON.stringify(feedbackConfig)};

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



