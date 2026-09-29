"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

type AlignmentMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

type DistributionMode = "horizontal" | "vertical";

type MultiSelectionToolsProps = {
  selectedCount: number;
  onAlign: (mode: AlignmentMode) => void;
  onDistribute: (mode: DistributionMode) => void;
};

const alignmentOptions = [
  { mode: "left", label: "Sinistra", icon: ArrowLeft },
  { mode: "center", label: "Centro", icon: MoveHorizontal },
  { mode: "right", label: "Destra", icon: ArrowRight },
  { mode: "top", label: "Alto", icon: ArrowUp },
  { mode: "middle", label: "Centro", icon: MoveVertical },
  { mode: "bottom", label: "Basso", icon: ArrowDown },
] as const;

export function MultiSelectionTools({
  selectedCount,
  onAlign,
  onDistribute,
}: MultiSelectionToolsProps) {
  if (selectedCount <= 1) return null;

  return (
    <div className="mb-5 rounded-xl border border-blue-700 bg-blue-950/40 p-3">
      <p className="mb-1 text-sm font-semibold">
        {selectedCount} elementi selezionati
      </p>

      <p className="mb-3 text-xs text-slate-400">
        Per una distribuzione visibile seleziona almeno tre elementi.
      </p>

      <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
        Allinea
      </p>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {alignmentOptions.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => onAlign(option.mode)}
              title={`Allinea ${option.label.toLowerCase()}`}
              className="flex items-center justify-center gap-1 rounded-lg bg-slate-700 px-2 py-2 text-xs hover:bg-slate-600"
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
        Distribuisci spazi
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={selectedCount < 3}
          onClick={() => onDistribute("horizontal")}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MoveHorizontal className="h-4 w-4" />
          Orizzontale
        </button>

        <button
          type="button"
          disabled={selectedCount < 3}
          onClick={() => onDistribute("vertical")}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MoveVertical className="h-4 w-4" />
          Verticale
        </button>
      </div>
    </div>
  );
}
