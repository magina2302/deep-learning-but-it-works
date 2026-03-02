import { useState } from "react";
import { X, Plus } from "lucide-react";

interface AddModuleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, subtitle: string, tags: string[]) => void;
}

const suggestedTags = ["Engineering", "Mathematics", "Programming", "Science", "Core", "Advanced", "Practical", "Elective"];

export function AddModuleModal({ open, onClose, onAdd }: AddModuleModalProps) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  if (!open) return null;

  const nameError = name.length > 0 && name.length < 2 ? "Name must be at least 2 characters" : "";
  const canSubmit = name.length >= 2;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !selectedTags.includes(t)) {
      setSelectedTags((prev) => [...prev, t]);
      setCustomTag("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd(name.trim(), subtitle.trim(), selectedTags);
    setName("");
    setSubtitle("");
    setSelectedTags([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h3>Add New Module</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Module Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Linear Algebra"
              className="w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ fontSize: "0.875rem" }}
              autoFocus
            />
            {nameError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{nameError}</p>}
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>
              Subtitle <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Vectors, matrices & transformations"
              className="w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ fontSize: "0.875rem" }}
            />
          </div>

          <div>
            <label className="block mb-2" style={{ fontSize: "0.8rem" }}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedTags.includes(tag)
                      ? "text-white"
                      : "bg-[var(--accent)] text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    selectedTags.includes(tag)
                      ? { background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.75rem" }
                      : { fontSize: "0.75rem" }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                placeholder="Custom tag..."
                className="flex-1 bg-[var(--input-background)] rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.8rem" }}
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 py-2 rounded-xl bg-[var(--accent)] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                style={{ fontSize: "0.8rem" }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-foreground hover:bg-[var(--muted)] transition-colors cursor-pointer"
              style={{ fontSize: "0.875rem" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-xl text-white transition-all disabled:opacity-40 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.875rem" }}
            >
              Add Module
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
