import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * KernUI Badge (pill, Paragraph/X-Small). Tones map to KernUI semantic groups.
 * "soft" is the accessible variant of KernUI's Light style: *-mute fill with
 * *-dark text (KernUI Light uses *-base text, which falls below 3:1 on mute).
 */
export const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        success: "",
        info: "",
        warning: "",
        error: "",
        feature: "",
        verified: "",
        highlight: "",
        neutral: "",
        muted: "",
      },
      variant: {
        soft: "",
        stroke: "border",
        fill: "text-white",
      },
    },
    compoundVariants: [
      { tone: "success", variant: "soft", className: "bg-success-mute text-success-dark [&_svg]:text-success-base" },
      { tone: "info", variant: "soft", className: "bg-info-mute text-info-dark [&_svg]:text-info-base" },
      { tone: "warning", variant: "soft", className: "bg-warning-mute text-warning-dark [&_svg]:text-warning-base" },
      { tone: "error", variant: "soft", className: "bg-error-mute text-error-dark [&_svg]:text-error-base" },
      { tone: "feature", variant: "soft", className: "bg-feature-mute text-feature-dark [&_svg]:text-feature-base" },
      { tone: "verified", variant: "soft", className: "bg-verified-mute text-verified-dark [&_svg]:text-verified-base" },
      { tone: "highlight", variant: "soft", className: "bg-highlight-mute text-highlight-dark [&_svg]:text-highlight-base" },
      { tone: "neutral", variant: "soft", className: "bg-layer text-sub [&_svg]:text-sub" },
      { tone: "muted", variant: "soft", className: "border border-stroke-mild bg-transparent text-sub [&_svg]:text-soft" },
      { tone: "success", variant: "stroke", className: "border-success-base bg-success-mute text-success-dark" },
      { tone: "warning", variant: "stroke", className: "border-warning-base bg-warning-mute text-warning-dark" },
      { tone: "error", variant: "stroke", className: "border-error-base bg-error-mute text-error-dark" },
      { tone: "info", variant: "stroke", className: "border-info-base bg-info-mute text-info-dark" },
      { tone: "feature", variant: "stroke", className: "border-feature-base bg-feature-mute text-feature-dark" },
      { tone: "neutral", variant: "stroke", className: "border-stroke-strong bg-default text-sub" },
      { tone: "success", variant: "fill", className: "bg-success-base" },
      { tone: "warning", variant: "fill", className: "bg-warning-base" },
      { tone: "error", variant: "fill", className: "bg-error-base" },
      { tone: "info", variant: "fill", className: "bg-info-base" },
      { tone: "feature", variant: "fill", className: "bg-feature-base" },
      { tone: "neutral", variant: "fill", className: "bg-weak text-inverse" },
    ],
    defaultVariants: { tone: "neutral", variant: "soft" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const DOT: Record<string, string> = {
  success: "bg-success-base",
  info: "bg-info-base",
  warning: "bg-warning-base",
  error: "bg-error-base",
  feature: "bg-feature-base",
  verified: "bg-verified-base",
  highlight: "bg-highlight-base",
  neutral: "bg-soft",
  muted: "bg-soft",
};

export function Badge({ className, tone, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, variant }), dot && "pl-2", className)} {...props}>
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone ?? "neutral"])} />}
      {children}
    </span>
  );
}

/** KernUI Tag — bordered, radius-sm, used for filters and metadata chips. */
export function Tag({
  className,
  children,
  onRemove,
  removeLabel,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { onRemove?: () => void; removeLabel?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm border border-stroke-soft bg-default px-2 text-xs text-sub shadow-tag",
        onRemove && "pr-1",
        className,
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove"}
          className="grid size-4 place-items-center rounded-xs text-soft hover:bg-layer hover:text-strong"
        >
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
