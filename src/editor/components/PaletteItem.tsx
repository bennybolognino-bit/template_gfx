"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { palette } from "../catalog";
export function PaletteItem({
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


