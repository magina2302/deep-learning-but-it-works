import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

interface AddModulePayload {
  name: string;
  subtitle: string;
  tags: string[];
  goal: string;
  deadline?: string;
  weeklyStudyMinutes: number;
  baselineConfidence: number;
  knownWeakAreas: string[];
  constraints?: string;
  initialSubtopics: string[];
}

interface AddModuleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddModulePayload) => void;
}

const suggestedTags = ["Engineering", "Mathematics", "Programming", "Science", "Core", "Advanced", "Practical", "Elective"];
const confidencePresets = [20, 40, 60, 80];

function parseCsvInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AddModuleModal({ open, onClose, onAdd }: AddModuleModalProps) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [weeklyStudyMinutes, setWeeklyStudyMinutes] = useState("180");
  const [baselineConfidence, setBaselineConfidence] = useState(40);
  const [weakAreasInput, setWeakAreasInput] = useState("");
  const [constraints, setConstraints] = useState("");
  const [initialSubtopicsInput, setInitialSubtopicsInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const nameError = name.length > 0 && name.length < 2 ? "Name must be at least 2 characters" : "";
  const goalError = goal.length > 0 && goal.length < 10 ? "Goal should explain what success looks like" : "";
  const canSubmit = name.trim().length >= 2 && goal.trim().length >= 10;

  const inferredSubtopics = useMemo(() => {
    const direct = parseCsvInput(initialSubtopicsInput);
    if (direct.length > 0) return direct;

    const fallback = [subtitle, weakAreasInput]
      .flatMap((value) => parseCsvInput(value))
      .slice(0, 6);

    return fallback;
  }, [initialSubtopicsInput, subtitle, weakAreasInput]);

  if (!open) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    const nextTag = customTag.trim();
    if (nextTag && !selectedTags.includes(nextTag)) {
      setSelectedTags((prev) => [...prev, nextTag]);
      setCustomTag("");
    }
  };

  const resetForm = () => {
    setName("");
    setSubtitle("");
    setGoal("");
    setDeadline("");
    setWeeklyStudyMinutes("180");
    setBaselineConfidence(40);
    setWeakAreasInput("");
    setConstraints("");
    setInitialSubtopicsInput("");
    setSelectedTags([]);
    setCustomTag("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onAdd({
      name: name.trim(),
      subtitle: subtitle.trim(),
      tags: selectedTags,
      goal: goal.trim(),
      deadline: deadline || undefined,
      weeklyStudyMinutes: parseInt(weeklyStudyMinutes, 10) || 180,
      baselineConfidence,
      knownWeakAreas: parseCsvInput(weakAreasInput),
      constraints: constraints.trim() || undefined,
      initialSubtopics: inferredSubtopics,
    });
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3>Add New Module</h3>
              <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                Start with a goal, weak spots, and pacing so Gradify can coach from day one.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Module Name *</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Control Systems"
                className="w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.875rem" }}
                autoFocus
              />
              {nameError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{nameError}</p>}
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="e.g., Stability, root locus, frequency response"
                className="w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.875rem" }}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Goal *</label>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={3}
              placeholder="What are you trying to achieve? Example: score above 80% in the control systems midterm on March 25."
              className="w-full resize-none bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ fontSize: "0.875rem" }}
            />
            {goalError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{goalError}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.875rem" }}
              />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Weekly Study Minutes</label>
              <input
                type="number"
                min="30"
                max="1200"
                step="15"
                value={weeklyStudyMinutes}
                onChange={(event) => setWeeklyStudyMinutes(event.target.value)}
                className="w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.875rem" }}
              />
            </div>
            <div>
              <label className="block mb-2" style={{ fontSize: "0.8rem" }}>Current Confidence</label>
              <div className="flex flex-wrap gap-2">
                {confidencePresets.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBaselineConfidence(value)}
                    className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${baselineConfidence === value ? "text-white" : "bg-[var(--accent)] text-muted-foreground hover:text-foreground"}`}
                    style={baselineConfidence === value ? { background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.75rem" } : { fontSize: "0.75rem" }}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Known Weak Areas</label>
              <textarea
                value={weakAreasInput}
                onChange={(event) => setWeakAreasInput(event.target.value)}
                rows={3}
                placeholder="Comma or newline separated. Example: root locus, Bode plots"
                className="w-full resize-none bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.875rem" }}
              />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Constraints</label>
              <textarea
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                rows={3}
                placeholder="Example: only 30 minutes on weekdays, exam in two weeks, weak with derivations"
                className="w-full resize-none bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.875rem" }}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Seed Subtopics</label>
            <textarea
              value={initialSubtopicsInput}
              onChange={(event) => setInitialSubtopicsInput(event.target.value)}
              rows={3}
              placeholder="Optional. Add syllabus topics or chapters. These become your initial review items."
              className="w-full resize-none bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ fontSize: "0.875rem" }}
            />
            {inferredSubtopics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {inferredSubtopics.slice(0, 8).map((subtopic) => (
                  <span key={subtopic} className="px-2 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground" style={{ fontSize: "0.68rem" }}>
                    {subtopic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block mb-2" style={{ fontSize: "0.8rem" }}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedTags.includes(tag) ? "text-white" : "bg-[var(--accent)] text-muted-foreground hover:text-foreground"}`}
                  style={selectedTags.includes(tag) ? { background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.75rem" } : { fontSize: "0.75rem" }}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
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
              Create Diagnostic Module
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
