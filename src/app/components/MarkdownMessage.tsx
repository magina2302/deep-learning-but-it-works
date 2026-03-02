import { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function normalizeMathMarkdown(content: string): string {
  const normalizedDelimiters = content
    .replace(/\\\[((?:.|\n)*?)\\\]/g, "$$$1$$")
    .replace(/\\\(((?:.|\n)*?)\\\)/g, "$1$");

  const latexKeywordRegex = /\\(?:frac|dfrac|tfrac|sum|int|sqrt|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|sin|cos|tan|log|ln|cdot|times|leq|geq|neq|approx|infty)\b/;

  const latexToUnicodeMap: Record<string, string> = {
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\delta": "δ",
    "\\theta": "θ",
    "\\lambda": "λ",
    "\\mu": "μ",
    "\\pi": "π",
    "\\sigma": "σ",
    "\\omega": "ω",
    "\\Omega": "Ω",
    "\\Gamma": "Γ",
    "\\Delta": "Δ",
    "\\Theta": "Θ",
    "\\Lambda": "Λ",
    "\\Pi": "Π",
    "\\Sigma": "Σ",
    "\\infty": "∞",
    "\\sum": "∑",
    "\\int": "∫",
    "\\sin": "sin",
    "\\cos": "cos",
    "\\tan": "tan",
    "\\cot": "cot",
    "\\sec": "sec",
    "\\csc": "csc",
    "\\arcsin": "arcsin",
    "\\arccos": "arccos",
    "\\arctan": "arctan",
  };

  const convertLatexTokensOutsideMath = (line: string): string => {
    let output = "";
    let inMath = false;

    for (let index = 0; index < line.length; index += 1) {
      const current = line[index];
      const previous = index > 0 ? line[index - 1] : "";

      if (current === "$" && previous !== "\\") {
        inMath = !inMath;
        output += current;
        continue;
      }

      if (!inMath && current === "\\") {
        const tail = line.slice(index);
        const matched = Object.keys(latexToUnicodeMap).find((token) => tail.startsWith(token));
        if (matched) {
          output += latexToUnicodeMap[matched];
          index += matched.length - 1;
          continue;
        }
      }

      output += current;
    }

    return output;
  };

  return normalizedDelimiters
    .split("\n")
    .map((line) => {
      let nextLine = line;

      const stripUnescapedDollars = (value: string) => value.replace(/(?<!\\)\$/g, "");
      const hasComplexLatexEnvironment = /\\begin\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix)\}/.test(nextLine);
      const latexCommandCount = (nextLine.match(/\\[a-zA-Z]+/g) || []).length;
      const initialDollarCount = (nextLine.match(/(?<!\\)\$/g) || []).length;

      if (hasComplexLatexEnvironment) {
        nextLine = stripUnescapedDollars(nextLine);
      }

      if (latexCommandCount >= 2 && initialDollarCount % 2 === 1) {
        nextLine = stripUnescapedDollars(nextLine);
      }

      const unescapedDollarCount = (nextLine.match(/(?<!\\)\$/g) || []).length;
      if (unescapedDollarCount % 2 === 1) {
        nextLine = nextLine
          .replace(/\s\$$/, "")
          .replace(/\$$/, "")
          .replace(/\$\s*,/g, ",")
          .replace(/\$\s*\./g, ".");
      }

      let hasMathDelimiters = /(?<!\\)\$/.test(nextLine);
      const isLikelyEquation = latexKeywordRegex.test(nextLine) && /[=_^{}]/.test(nextLine);

      if (!hasMathDelimiters) {
        nextLine = convertLatexTokensOutsideMath(nextLine);
      }

      if (!hasMathDelimiters && hasComplexLatexEnvironment) {
        return `$$${nextLine.trim()}$$`;
      }

      hasMathDelimiters = /(?<!\\)\$/.test(nextLine);

      if (!hasMathDelimiters && isLikelyEquation) {
        const textWithoutLatex = nextLine
          .replace(/\\[a-zA-Z]+/g, " ")
          .replace(/[=_^{}()[\]0-9+\-*/.,]/g, " ");
        const englishWordCount = (textWithoutLatex.match(/\b[a-zA-Z]{3,}\b/g) || []).length;

        if (englishWordCount > 2) {
          return nextLine;
        }

        const bulletMatch = nextLine.match(/^(\s*[-*]\s+)(.+)$/);
        if (bulletMatch) {
          return `${bulletMatch[1]}$${bulletMatch[2].trim()}$`;
        }

        if (!nextLine.trimStart().startsWith("```")) {
          return `$${nextLine.trim()}$`;
        }
      }

      return nextLine;
    })
    .join("\n");
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
          code: ({ className, children }) => (
            <MarkdownCode inline={!className} className={className}>
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
