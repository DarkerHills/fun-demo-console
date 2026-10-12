import * as React from "react";
import { cn } from "@/lib/utils";

/** KernUI surface card: bg-default, stroke-soft border, radius-md, shadow-xs. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border border-stroke-soft bg-default shadow-xs", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0 flex-[1_1_220px]">
        <h2 id={id} className="text-sm font-medium text-strong">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-sub">{description}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-stroke-soft", className)} />;
}
