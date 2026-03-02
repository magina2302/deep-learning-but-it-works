import React from "react";
import { useState, useRef } from "react";
import { X, Upload, FileText, BookOpen, FlaskConical, PenTool, Monitor } from "lucide-react";
import { ChatAttachment } from "../data/mock-data";

type FileCategory = "Lecture" | "PYP" | "Tutorial" | "Labs";

interface FileUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (attachments: ChatAttachment[]) => void;
}

interface PendingFile {
  id: string;
  file: File;
  category: FileCategory;
}

const MAX_FILE_CHARS = 8000;
const PDF_MAX_PAGES = 25;
const textMimePrefixes = ["text/"];
const textMimes = new Set([
  "application/json",
  "application/javascript",
  "application/typescript",
  "application/xml",
  "application/x-sh",
]);
const textExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "yaml",
  "yml",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "cs",
  "sql",
  "html",
  "css",
  "scss",
  "sh",
  "r",
  "m",
  "tex",
]);

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : "";
}

let pdfJsLoaderPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfJs() {
  if (!pdfJsLoaderPromise) {
    pdfJsLoaderPromise = import("pdfjs-dist").then((pdfJs) => {
      if (!pdfJs.GlobalWorkerOptions.workerSrc) {
        pdfJs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      }
      return pdfJs;
    });
  }
  return pdfJsLoaderPromise;
}

async function extractPdfText(file: File): Promise<string | undefined> {
  try {
    const pdfJs = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfJs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, PDF_MAX_PAGES);

    const pages: string[] = [];
    for (let index = 1; index <= pageCount; index++) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pages.push(pageText);
      }
    }

    await loadingTask.destroy();

    if (pages.length === 0) return undefined;
    const joined = pages.join("\n\n");
    if (joined.length <= MAX_FILE_CHARS) return joined;
    return `${joined.slice(0, MAX_FILE_CHARS)}\n\n[truncated: PDF text too long]`;
  } catch {
    return undefined;
  }
}

function isTextLikeFile(file: File): boolean {
  if (textMimePrefixes.some((prefix) => file.type.startsWith(prefix))) return true;
  if (textMimes.has(file.type)) return true;
  return textExtensions.has(getExtension(file.name));
}

async function readAttachmentContent(file: File): Promise<string | undefined> {
  const ext = getExtension(file.name);
  if (file.type === "application/pdf" || ext === "pdf") {
    return extractPdfText(file);
  }

  if (!isTextLikeFile(file)) return undefined;
  const raw = await file.text();
  if (!raw.trim()) return undefined;
  if (raw.length <= MAX_FILE_CHARS) return raw;
  return `${raw.slice(0, MAX_FILE_CHARS)}\n\n[truncated: file too long]`;
}

const categories: { id: FileCategory; label: string; icon: typeof BookOpen; description: string }[] = [
  { id: "Lecture", label: "Lecture", icon: BookOpen, description: "Lecture slides & notes" },
  { id: "PYP", label: "PYP", icon: FileText, description: "Past year papers" },
  { id: "Tutorial", label: "Tutorial", icon: PenTool, description: "Tutorial sheets & solutions" },
  { id: "Labs", label: "Labs", icon: FlaskConical, description: "Lab manuals & reports" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadModal({ open, onClose, onUpload }: FileUploadModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("Lecture");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      category: selectedCategory,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const attachments: ChatAttachment[] = await Promise.all(
      pendingFiles.map(async (pf) => ({
        id: pf.id,
        name: pf.file.name,
        size: formatFileSize(pf.file.size),
        category: pf.category,
        mimeType: pf.file.type || undefined,
        content: await readAttachmentContent(pf.file),
      })),
    );
    onUpload(attachments);
    setPendingFiles([]);
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
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
              style={{ background: "linear-gradient(135deg, #B352D7, #6129CC)" }}
            >
              <Upload className="w-4 h-4 text-white" />
            </div>
            <h3>Upload Files</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Category selector */}
          <div>
            <label className="block mb-2" style={{ fontSize: "0.8rem" }}>Select Category</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      isSelected ? "border-primary" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                    }`}
                    style={isSelected ? { background: "rgba(255,117,65,0.08)" } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CatIcon className="w-4 h-4" style={{ color: isSelected ? "var(--primary)" : "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "0.85rem" }} className={isSelected ? "text-primary" : "text-foreground"}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
            }`}
          >
            <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-foreground mb-1" style={{ fontSize: "0.85rem" }}>
              Drop files here or click to browse
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
              PDF, DOC, images, and more
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div>
              <label className="block mb-2" style={{ fontSize: "0.8rem" }}>
                Files ({pendingFiles.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-center gap-3 bg-[var(--accent)] rounded-xl px-3 py-2.5"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate" style={{ fontSize: "0.8rem" }}>{pf.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                          {formatFileSize(pf.file.size)}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-white"
                          style={{ fontSize: "0.55rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
                        >
                          {pf.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(pf.id); }}
                      className="w-6 h-6 rounded-md hover:bg-[var(--muted)] flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              type="button"
              onClick={handleUpload}
              disabled={pendingFiles.length === 0}
              className="flex-1 py-3 rounded-xl text-white transition-all disabled:opacity-40 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B352D7, #6129CC)", fontSize: "0.875rem" }}
            >
              Upload {pendingFiles.length > 0 ? `(${pendingFiles.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
