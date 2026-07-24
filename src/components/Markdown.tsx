"use client";

import type { ReactNode } from "react";

// Minimal markdown renderer for chat bubbles — bold/italic/code, bullet and numbered
// lists, and small headers. Pure React elements (no HTML injection), no dependency
// weight. Anything it doesn't recognize renders as plain text, so malformed model
// output degrades gracefully.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "header"; text: string };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    const last = blocks[blocks.length - 1];

    if (!trimmed) {
      // Blank line closes the current block.
      if (last && last.type === "paragraph" && last.lines.length === 0) continue;
      blocks.push({ type: "paragraph", lines: [] });
      continue;
    }

    const headerMatch = trimmed.match(/^#{1,4}\s+(.*)$/);
    if (headerMatch) {
      blocks.push({ type: "header", text: headerMatch[1] });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      if (last?.type === "bullets") last.items.push(bulletMatch[1]);
      else blocks.push({ type: "bullets", items: [bulletMatch[1]] });
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      if (last?.type === "numbered") last.items.push(numberedMatch[1]);
      else blocks.push({ type: "numbered", items: [numberedMatch[1]] });
      continue;
    }

    if (last?.type === "paragraph") last.lines.push(trimmed);
    else blocks.push({ type: "paragraph", lines: [trimmed] });
  }

  return blocks.filter(
    (block) => !(block.type === "paragraph" && block.lines.length === 0)
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="md">
      {blocks.map((block, blockIndex) => {
        const key = `b${blockIndex}`;
        switch (block.type) {
          case "header":
            return <div key={key} className="md-h">{renderInline(block.text, key)}</div>;
          case "bullets":
            return (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          case "numbered":
            return (
              <ol key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            );
          case "paragraph":
            return (
              <p key={key}>
                {block.lines.map((line, lineIndex) => (
                  <span key={`${key}-${lineIndex}`}>
                    {lineIndex > 0 && <br />}
                    {renderInline(line, `${key}-${lineIndex}`)}
                  </span>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
