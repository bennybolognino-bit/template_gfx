"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";

import { palette } from "@/editor/catalog";
import type { CanvasElement } from "@/editor/types";
import { PaletteItem } from "@/editor/components/PaletteItem";

type LayerDirection = "up" | "down" | "front" | "back";

type ComponentsLayersPanelProps = {
  elements: CanvasElement[];
  selectedIds: string[];
  onSelectElement: (id: string, additive: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveLayer: (id: string, direction: LayerDirection) => void;
};

export function ComponentsLayersPanel({
  elements,
  selectedIds,
  onSelectElement,
  onToggleVisibility,
  onToggleLock,
  onMoveLayer,
}: ComponentsLayersPanelProps) {
  return (
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
                onClick={() => onSelectElement(element.id, false)}
                className="mb-2 w-full truncate text-left text-sm"
              >
                {element.isCanvasBackground
                  ? "Sfondo canvas"
                  : element.text || element.type}
              </button>

              <div className="grid grid-cols-6 gap-1">
                <button
                  type="button"
                  onClick={() => onToggleVisibility(element.id)}
                  className="flex items-center justify-center rounded bg-slate-700 p-1 hover:bg-slate-600"
                  title="Mostra o nascondi"
                  aria-label="Mostra o nascondi"
                >
                  {element.visible === false ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleLock(element.id)}
                  className="flex items-center justify-center rounded bg-slate-700 p-1 hover:bg-slate-600"
                  title="Blocca o sblocca"
                  aria-label="Blocca o sblocca"
                >
                  {element.locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onMoveLayer(element.id, "up")}
                  className="flex items-center justify-center rounded bg-slate-700 p-1 hover:bg-slate-600"
                  title="Porta avanti"
                  aria-label="Porta avanti"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onMoveLayer(element.id, "down")}
                  className="flex items-center justify-center rounded bg-slate-700 p-1 hover:bg-slate-600"
                  title="Porta indietro"
                  aria-label="Porta indietro"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onMoveLayer(element.id, "front")}
                  className="flex items-center justify-center rounded bg-blue-800 p-1 hover:bg-blue-700"
                  title="Porta in primo piano"
                  aria-label="Porta in primo piano"
                >
                  <ChevronsUp className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onMoveLayer(element.id, "back")}
                  className="flex items-center justify-center rounded bg-blue-800 p-1 hover:bg-blue-700"
                  title="Porta sullo sfondo"
                  aria-label="Porta sullo sfondo"
                >
                  <ChevronsDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
