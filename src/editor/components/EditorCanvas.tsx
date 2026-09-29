"use client";

import type { CSSProperties } from "react";

import { CanvasItem } from "@/editor/components/CanvasItem";
import type { CanvasElement } from "@/editor/types";

type DeviceMode = "desktop" | "tablet" | "mobile";

type EditorCanvasProps = {
  elements: CanvasElement[];
  renderedElements: CanvasElement[];
  selectedIds: string[];
  draggedCanvasId: string | null;
  deviceMode: DeviceMode;
  isOver: boolean;
  setNodeRef: (node: HTMLDivElement | null) => void;
  onClearSelection: () => void;
  onSelectElement: (id: string, additive: boolean) => void;
  onMoveAbsoluteElement: (
    id: string,
    deltaX: number,
    deltaY: number,
  ) => void;
  onDraggedCanvasIdChange: (id: string | null) => void;
  onReorderCanvasElement: (targetId: string) => void;
};

function getCanvasWidth(deviceMode: DeviceMode) {
  if (deviceMode === "tablet") return "768px";
  if (deviceMode === "mobile") return "390px";
  return "1180px";
}

function getElementStyle(element: CanvasElement): CSSProperties {
  const isAbsolute =
    element.isCanvasBackground ||
    element.positionMode === "absolute";

  return {
    display: element.visible === false ? "none" : undefined,
    pointerEvents:
      element.isCanvasBackground || element.locked
        ? "none"
        : undefined,
    position: isAbsolute ? "absolute" : "relative",
    left: element.isCanvasBackground
      ? 0
      : element.positionMode === "absolute"
        ? element.x ?? 0
        : undefined,
    top: element.isCanvasBackground
      ? 0
      : element.positionMode === "absolute"
        ? element.y ?? 0
        : undefined,
    width: element.isCanvasBackground
      ? "100%"
      : element.positionMode === "absolute"
        ? element.widthPx ?? 320
        : undefined,
    height: element.isCanvasBackground
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
      (element.borderWidth ?? 0) > 0 ? "solid" : undefined,
    borderWidth: element.borderWidth ?? 0,
    borderColor: element.borderColor ?? "#0f172a",
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
      (element.type === "shape" &&
        element.shapeType === "ellipse")
        ? "hidden"
        : element.positionMode === "absolute"
          ? "auto"
          : undefined,
  };
}

export function EditorCanvas({
  elements,
  renderedElements,
  selectedIds,
  draggedCanvasId,
  deviceMode,
  isOver,
  setNodeRef,
  onClearSelection,
  onSelectElement,
  onMoveAbsoluteElement,
  onDraggedCanvasIdChange,
  onReorderCanvasElement,
}: EditorCanvasProps) {
  return (
    <section className="overflow-auto bg-slate-900 p-8">
      <div
        ref={setNodeRef}
        onClick={onClearSelection}
        style={{
          width: getCanvasWidth(deviceMode),
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
            draggable={
              element.positionMode !== "absolute" &&
              !element.locked
            }
            tabIndex={0}
            onKeyDown={(event) => {
              if (element.locked) return;
              if (element.positionMode !== "absolute") return;

              const step = event.shiftKey ? 10 : 1;

              if (event.key === "ArrowLeft") {
                event.preventDefault();
                onMoveAbsoluteElement(element.id, -step, 0);
              }

              if (event.key === "ArrowRight") {
                event.preventDefault();
                onMoveAbsoluteElement(element.id, step, 0);
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                onMoveAbsoluteElement(element.id, 0, -step);
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                onMoveAbsoluteElement(element.id, 0, step);
              }
            }}
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              onDraggedCanvasIdChange(element.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => onDraggedCanvasIdChange(null)}
            onDragOver={(event) => {
              if (draggedCanvasId) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              onReorderCanvasElement(element.id);
            }}
            className={`cursor-move rounded-lg transition ${
              draggedCanvasId === element.id
                ? "opacity-40"
                : "opacity-100"
            }`}
            style={getElementStyle(element)}
          >
            <CanvasItem
              element={element}
              selected={selectedIds.includes(element.id)}
              onSelect={(additive) =>
                onSelectElement(element.id, additive)
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
