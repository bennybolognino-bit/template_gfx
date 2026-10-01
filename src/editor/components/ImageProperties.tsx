"use client";

import type { CanvasElement } from "@/editor/types";

type ImagePropertiesProps = {
  element: CanvasElement;
  onUpdate: (changes: Partial<CanvasElement>) => void;
  onImageUpload: (file: File) => void;
  onSetCanvasBackground: (id: string) => void;
  onRemoveCanvasBackground: (id: string) => void;
};

export function ImageProperties({
  element,
  onUpdate,
  onImageUpload,
  onSetCanvasBackground,
  onRemoveCanvasBackground,
}: ImagePropertiesProps) {
  if (element.type !== "image") return null;

  return (
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
          value={element.imageSrc ?? ""}
          onChange={(event) =>
            onUpdate({ imageSrc: event.target.value })
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

            if (file) onImageUpload(file);

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
          value={element.objectFit ?? "cover"}
          onChange={(event) =>
            onUpdate({
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
          Angoli: {element.borderRadius ?? 12}px
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={element.borderRadius ?? 12}
          onChange={(event) =>
            onUpdate({
              borderRadius: Number(event.target.value),
            })
          }
          className="w-full"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">
          Opacità: {element.opacity ?? 100}%
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={element.opacity ?? 100}
          onChange={(event) =>
            onUpdate({
              opacity: Number(event.target.value),
            })
          }
          className="w-full"
        />
      </label>

      {element.isCanvasBackground ? (
        <button
          type="button"
          onClick={() =>
            onRemoveCanvasBackground(element.id)
          }
          className="w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold hover:bg-amber-600"
        >
          Rimuovi come sfondo canvas
        </button>
      ) : (
        <button
          type="button"
          disabled={!element.imageSrc}
          onClick={() => onSetCanvasBackground(element.id)}
          className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Usa come sfondo canvas
        </button>
      )}

      <button
        type="button"
        onClick={() => onUpdate({ imageSrc: "" })}
        className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600"
      >
        Rimuovi immagine
      </button>
    </div>
  );
}
