"use client";

import { Copy, Download } from "lucide-react";

type CodePreviewModalProps = {
  open: boolean;
  generatedCode: string;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
};

export function CodePreviewModal({
  open,
  generatedCode,
  copied,
  onClose,
  onCopy,
  onDownload,
}: CodePreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
      <div className="flex h-[80vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Codice React generato</h2>

          <button
            type="button"
            onClick={onClose}
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
            type="button"
            onClick={onCopy}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copiato" : "Copia"}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold"
          >
            <Download className="h-4 w-4" />
            Scarica file
          </button>
        </div>
      </div>
    </div>
  );
}
