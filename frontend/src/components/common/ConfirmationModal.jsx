import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  confirmColor = "red", // 'red', 'emerald', 'blue', 'purple'
  loading = false
}) {
  if (!isOpen) return null;

  const colorStyles = {
    red: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20",
    emerald: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20",
    blue: "bg-soc-blue hover:bg-blue-500 text-white shadow-blue-500/20",
    purple: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20",
  };

  const btnClass = colorStyles[confirmColor] || colorStyles.red;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-navy-900 border border-navy-750 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-navy-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 ${btnClass}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
