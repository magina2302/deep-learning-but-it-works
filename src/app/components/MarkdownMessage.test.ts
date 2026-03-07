import { describe, expect, it } from "vitest";
import { normalizeMathMarkdown } from "./MarkdownMessage";

describe("normalizeMathMarkdown", () => {
  it("keeps multiline matrix environments inside one display-math block", () => {
    const input = [
      "Convert this matrix:",
      "$$\\begin{bmatrix}",
      String.raw`2 & 6 & 1 \\\\`,
      String.raw`3 & -6 & -1 \\\\`,
      "-2 & 6 & 2",
      "\\end{bmatrix}$$",
    ].join("\n");

    const output = normalizeMathMarkdown(input);

    expect(output).toContain("$$\\begin{bmatrix}\n2 & 6 & 1");
    expect(output).toContain("\\end{bmatrix}$$");
    expect(output).not.toContain("$$\\begin{bmatrix}$$");
  });

  it("wraps bare multiline matrix environments in display math", () => {
    const input = [
      "\\begin{pmatrix}",
      String.raw`1 & 0 \\\\`,
      "0 & 1",
      "\\end{pmatrix}",
    ].join("\n");

    expect(normalizeMathMarkdown(input)).toBe([
      "$$\\begin{pmatrix}",
      String.raw`1 & 0 \\\\`,
      "0 & 1",
      "\\end{pmatrix}$$",
    ].join("\n"));
  });
});