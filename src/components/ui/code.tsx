"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { useCopy } from "@/lib/hooks/use-copy";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function CopyButton({
  value,
  label = "Copy",
  toastLabel,
  className,
  size = "icon-sm",
  showText,
}: {
  value: string;
  label?: string;
  toastLabel?: string;
  className?: string;
  size?: "icon-sm" | "icon" | "xs" | "sm";
  showText?: boolean;
}) {
  const { copied, copy } = useCopy();
  return (
    <Button
      type="button"
      variant="ghost"
      size={showText ? (size === "sm" ? "sm" : "xs") : size}
      aria-label={copied ? "Copied" : label}
      onClick={(e) => {
        e.stopPropagation();
        copy(value, toastLabel);
      }}
      className={className}
    >
      {copied ? <Check className="text-success-base" /> : <Copy />}
      {showText && <span className="max-sm:sr-only">{copied ? "Copied" : label}</span>}
    </Button>
  );
}

/* Minimal tokenizer — keeps the bundle light while giving code real structure. */
type Lang = "ts" | "js" | "json" | "bash";

const KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "await", "async", "return", "function", "new", "if", "else",
  "type", "interface", "as", "true", "false", "null", "undefined", "try", "catch", "throw",
]);

function tokenize(code: string, lang: Lang): { t: string; c?: string }[] {
  const out: { t: string; c?: string }[] = [];
  const re =
    lang === "json"
      ? /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|\b(true|false|null)\b/g
      : lang === "bash"
        ? /(#.*$)|("(?:[^"\\]|\\.)*"|'[^']*')|(^|\s)(npm|pnpm|yarn|npx|curl)\b|(\s--?[\w-]+)/gm
        : /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b([A-Za-z_$][\w$]*)\b(?=\s*\()|\b([A-Za-z_$][\w$]*)\b|(\b\d+(?:\.\d+)?\b)/gm;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index) });
    if (lang === "json") {
      if (m[1]) {
        out.push({ t: m[1], c: m[2] ? "text-primary-dark dark:text-primary-faint" : "text-success-dark" });
        if (m[2]) out.push({ t: m[2] });
      } else if (m[3]) out.push({ t: m[3], c: "text-warning-dark" });
      else out.push({ t: m[0], c: "text-info-base" });
    } else if (lang === "bash") {
      if (m[1]) out.push({ t: m[1], c: "text-sub" });
      else if (m[2]) out.push({ t: m[2], c: "text-success-dark" });
      else if (m[4]) {
        out.push({ t: m[3] ?? "" });
        out.push({ t: m[4], c: "text-primary-base" });
      } else out.push({ t: m[0], c: "text-info-base" });
    } else {
      if (m[1]) out.push({ t: m[1], c: "text-sub italic" });
      else if (m[2]) out.push({ t: m[2], c: "text-success-dark" });
      else if (m[3]) out.push({ t: m[3], c: KEYWORDS.has(m[3]) ? "text-primary-base" : "text-info-base" });
      else if (m[4]) out.push({ t: m[4], c: KEYWORDS.has(m[4]) ? "text-primary-base" : /^[A-Z]/.test(m[4]) ? "text-warning-dark" : undefined });
      else out.push({ t: m[0], c: "text-warning-dark" });
    }
    last = re.lastIndex;
  }
  if (last < code.length) out.push({ t: code.slice(last) });
  return out;
}

export function CodeBlock({
  code,
  lang = "ts",
  title,
  actions,
  className,
  maxHeight,
  copyLabel = "Code",
}: {
  code: string;
  lang?: Lang;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  maxHeight?: number;
  copyLabel?: string;
}) {
  const tokens = React.useMemo(() => tokenize(code, lang), [code, lang]);
  const lines = code.split("\n").length;
  return (
    <div className={cn("overflow-hidden rounded-md border border-stroke-soft bg-surface", className)}>
      <div className="flex h-10 items-center justify-between gap-2 border-b border-stroke-soft bg-default pr-1.5 pl-3">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-sub">{title}</div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <CopyButton value={code} label={`Copy ${copyLabel.toLowerCase()}`} toastLabel={copyLabel} showText />
        </div>
      </div>
      <div className="scrollbar-thin overflow-auto" style={{ maxHeight }}>
        <pre className="flex min-w-fit py-3 text-[12.5px] leading-5">
          <span aria-hidden className="sticky left-0 select-none bg-surface pr-3 pl-3 text-right text-soft">
            {Array.from({ length: lines }, (_, i) => (
              <span key={i} className="block">
                {i + 1}
              </span>
            ))}
          </span>
          <code className="pr-4 font-mono text-strong">
            {tokens.map((tk, i) =>
              tk.c ? (
                <span key={i} className={tk.c}>
                  {tk.t}
                </span>
              ) : (
                <React.Fragment key={i}>{tk.t}</React.Fragment>
              ),
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

/** Monospace value with copy affordance — ids, hashes, keys. */
export function MonoValue({
  value,
  display,
  className,
  copyLabel,
}: {
  value: string;
  display?: string;
  className?: string;
  copyLabel?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-0.5", className)}>
      <span className="truncate font-mono text-[13px] text-strong" title={value}>
        {display ?? value}
      </span>
      <CopyButton value={value} label={`Copy ${copyLabel ?? "value"}`} toastLabel={copyLabel} />
    </span>
  );
}
