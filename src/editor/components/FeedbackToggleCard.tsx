"use client";

type FeedbackToggleCardProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function FeedbackToggleCard({
  enabled,
  onToggle,
}: FeedbackToggleCardProps) {
  return (
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
        onClick={onToggle}
        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
          enabled ? "bg-green-600" : "bg-slate-700"
        }`}
      >
        {enabled ? "Attivo" : "Attiva"}
      </button>
    </div>
  );
}
