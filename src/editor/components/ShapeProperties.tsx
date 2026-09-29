"use client";

import type { CanvasElement } from "@/editor/types";

type ShapePropertiesProps = {
  element: CanvasElement;
  onUpdate: (changes: Partial<CanvasElement>) => void;
};

const shapeOptions = [
  ["rectangle", "Rettangolo"],
  ["ellipse", "Ellisse"],
  ["line", "Linea"],
] as const;

export function ShapeProperties({
  element,
  onUpdate,
}: ShapePropertiesProps) {
  if (element.type !== "shape") return null;

  return (
    <div className="space-y-4 rounded-xl border border-cyan-700 bg-cyan-950/20 p-4">
      <h3 className="font-semibold text-white">
        Proprietà forma
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {shapeOptions.map(([shapeType, label]) => (
          <button
            key={shapeType}
            type="button"
            onClick={() => onUpdate({ shapeType })}
            className={`rounded-lg px-2 py-2 text-xs ${
              element.shapeType === shapeType
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
          value={element.background}
          onChange={(event) =>
            onUpdate({ background: event.target.value })
          }
          className="h-10 w-16"
        />
      </label>

      {element.shapeType === "line" && (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">
            Spessore: {element.shapeThickness ?? 4}px
          </span>
          <input
            type="range"
            min="1"
            max="50"
            value={element.shapeThickness ?? 4}
            onChange={(event) =>
              onUpdate({
                shapeThickness: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </label>
      )}
    </div>
  );
}
