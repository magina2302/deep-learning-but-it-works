import { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function normalizeMathMarkdown(content: string): string {
  return content
    .replace(/\\\[((?:.|\n)*?)\\\]/g, "$$$1$$")
    .replace(/\\\(((?:.|\n)*?)\\\)/g, "$1$");
}

function MarkdownCode({ inline, className, children }: { inline?: boolean; className?: string; children?: ReactNode }) {
  const text = String(children ?? "").replace(/\n$/, "");
  const language = className?.replace("language-", "") || "text";

  if (inline) {
    return <code className="px-1 py-0.5 rounded bg-[var(--accent)] text-foreground">{children}</code>;
  }

  return (
    <div className="mb-2 last:mb-0 rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-3 py-1.5 flex items-center justify-between bg-[var(--accent)] border-b border-[var(--border)]">
        <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>{language}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(text).catch(() => {})}
          className="text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontSize: "0.65rem" }}
        >
          Copy
        </button>
      </div>
      <pre className="m-0 p-3 overflow-x-auto bg-[var(--card)]">
        <code className="text-foreground">{text}</code>
      </pre>
    </div>
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div style={{ fontSize: "0.875rem", lineHeight: "1.6", textAlign: "left" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          code: ({ inline, className, children }) => (
            <MarkdownCode inline={inline} className={className}>
              {children}
            </MarkdownCode>
          ),
          pre: ({ children }) => <>{children}</>,
          h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-medium mb-2">{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="underline text-primary">
              {children}
            </a>
          ),
        }}
      >
        {normalizeMathMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownMessage;
