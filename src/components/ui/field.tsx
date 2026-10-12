import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-sm border border-stroke-mild bg-default text-sm text-strong shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-soft hover:border-stroke-strong focus-visible:border-primary-base focus-visible:shadow-[0_0_0_3px_var(--primary-mute)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-layer disabled:text-sub aria-[invalid=true]:border-error-base aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_var(--error-mute)]";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { leading?: React.ReactNode; trailing?: React.ReactNode }
>(function Input({ className, leading, trailing, ...props }, ref) {
  if (!leading && !trailing) return <input ref={ref} className={cn(inputBase, "h-9 px-3", className)} {...props} />;
  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-soft [&_svg]:size-4">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        className={cn(inputBase, "h-9", leading ? "pl-9" : "pl-3", trailing ? "pr-10" : "pr-3", className)}
        {...props}
      />
      {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
    </div>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputBase, "min-h-24 px-3 py-2", className)} {...props} />;
  },
);

/** Label + control + hint/error, wired with ids for assistive tech. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-strong">
        {label}
        {optional && <span className="ml-1 font-normal text-sub">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="flex items-center gap-1 text-xs text-error-base">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-sub">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-stroke-mild bg-default px-1 font-mono text-[11px] text-sub",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
