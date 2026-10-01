"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";
import {
  Code2,
  Download,
  Monitor,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
  Upload,
} from "lucide-react";

type DeviceMode = "desktop" | "tablet" | "mobile";

type EditorHeaderProps = {
  projectName: string;
  deviceMode: DeviceMode;
  canUndo: boolean;
  canRedo: boolean;
  onProjectNameChange: (name: string) => void;
  onNewProject: () => void;
  onImportProject: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportProject: () => void;
  onDeviceModeChange: (device: DeviceMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onGenerateCode: () => void;
};

const devices = [
  { mode: "desktop", label: "Desktop", icon: Monitor },
  { mode: "tablet", label: "Tablet", icon: Tablet },
  { mode: "mobile", label: "Mobile", icon: Smartphone },
] as const;

export function EditorHeader({
  projectName,
  deviceMode,
  canUndo,
  canRedo,
  onProjectNameChange,
  onNewProject,
  onImportProject,
  onExportProject,
  onDeviceModeChange,
  onUndo,
  onRedo,
  onGenerateCode,
}: EditorHeaderProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
      <div>
        <h1 className="text-xl font-bold">Template GFX</h1>
        <p className="text-xs text-slate-400">
          Visual application builder
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-1">
        <input
          value={projectName}
          onChange={(event) =>
            onProjectNameChange(event.target.value)
          }
          className="w-36 rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Nome progetto"
        />

        <button
          type="button"
          onClick={onNewProject}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Nuovo
        </button>

        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-slate-700"
        >
          <Upload className="h-4 w-4" />
          Importa
        </button>

        <button
          type="button"
          onClick={onExportProject}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          Esporta
        </button>

        <input
          ref={importInputRef}
          type="file"
          accept=".json,.template-gfx.json"
          onChange={onImportProject}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          title="Annulla (Ctrl+Z)"
          className="rounded-lg p-2 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          title="Ripristina (Ctrl+Y)"
          className="rounded-lg p-2 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
        {devices.map((device) => {
          const Icon = device.icon;

          return (
            <button
              key={device.mode}
              type="button"
              onClick={() => onDeviceModeChange(device.mode)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                deviceMode === device.mode
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {device.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onGenerateCode}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
      >
        <Code2 className="h-4 w-4" />
        Genera codice
      </button>
    </header>
  );
}
