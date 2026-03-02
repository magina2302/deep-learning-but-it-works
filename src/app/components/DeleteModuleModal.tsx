import { AlertTriangle, X } from "lucide-react";
import { Module } from "../data/mock-data";

interface DeleteModuleModalProps {
  open: boolean;
  module: Module | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteModuleModal({ open, module, onClose, onConfirm }: DeleteModuleModalProps) {
  if (!open || !module) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(239,68,68,0.12)" }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: "#ef4444" }} />
            </div>
          </div>

          <h3 className="text-center mb-2">Delete Module?</h3>
          <p className="text-center text-muted-foreground mb-6" style={{ fontSize: "0.85rem" }}>
            Are you sure you want to delete <span className="text-foreground">{module.name}</span>? 
            This will remove all progress, chat history, and data for this module. This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-foreground hover:bg-[var(--muted)] transition-colors cursor-pointer"
              style={{ fontSize: "0.875rem" }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3 rounded-xl text-white transition-all cursor-pointer"
              style={{ backgroundColor: "#ef4444", fontSize: "0.875rem" }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
