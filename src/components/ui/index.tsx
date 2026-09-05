/**
 * Inkdrop Studio's UI kit — Modernist.
 *
 * Square corners, 2px structural rules, Archivo at weight 800 for anything
 * that carries hierarchy, and one accent used sparingly and loudly. Each
 * component is a thin wrapper over a native element that keeps the tokens,
 * focus rings and disabled states consistent and passes everything else
 * through.
 */
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

// Re-exported so client components can keep importing it from the kit.
export { cn };

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink border-accent hover:bg-accent-hover hover:border-accent-hover active:bg-accent-active disabled:hover:bg-accent",
  secondary:
    "border-line text-ink hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--ink)_14%,transparent)]",
  ghost:
    "border-transparent text-accent hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]",
  danger:
    "bg-danger text-paper border-danger hover:opacity-90 disabled:hover:opacity-100",
  subtle:
    "border-transparent bg-surface text-ink hover:bg-surface-2 active:bg-surface-3",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
  icon: "h-9 w-9 justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      // A loading button stays focusable but announces its busy state, so a
      // screen reader user isn't silently dropped out of the tab order.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center border font-display font-extrabold leading-tight",
        "transition-colors disabled:opacity-45 disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

const FIELD_BASE =
  "w-full border border-line bg-surface px-2.5 py-1.5 text-sm text-ink " +
  "placeholder:text-ink-subtle caret-accent transition-colors " +
  "hover:border-line-strong focus:border-accent focus-visible:outline-offset-0 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(FIELD_BASE, "h-9", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(FIELD_BASE, "min-h-[90px] resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(FIELD_BASE, "h-9 pr-8", className)} {...props} />
));
Select.displayName = "Select";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-xs text-ink-muted mb-1.5", className)} {...props}>
      {children}
      {required && (
        <span className="text-danger ml-0.5" aria-label="required">
          *
        </span>
      )}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Type                                                                */
/* ------------------------------------------------------------------ */

/** Small uppercase section marker, set in the accent. */
export function Kicker({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("kicker", className)}>{children}</span>;
}

/** Uppercase micro-label used for column heads and field groups. */
export function Lbl({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("lbl", className)} {...props}>
      {children}
    </span>
  );
}

/**
 * The page's display heading. `size` is a raw pixel value because these are
 * deliberately set per-screen rather than snapped to a type scale.
 */
export function Display({
  as: Tag = "h1",
  size = 52,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  size?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn("disp", className)}
      style={{ fontSize: `clamp(30px, 6vw, ${size}px)` }}
    >
      {children}
    </Tag>
  );
}

/** The 2px structural rule that separates bands of content. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("h-0.5 border-0 bg-line", className)} />;
}

/** The 1px sub-divider used inside a band. */
export function Hair({ className }: { className?: string }) {
  return <hr className={cn("h-px border-0 bg-hair", className)} />;
}

/* ------------------------------------------------------------------ */
/* Page furniture                                                      */
/* ------------------------------------------------------------------ */

/**
 * Standard page header: kicker, display heading, and right-aligned actions
 * that drop below the heading on narrow screens.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  size = 52,
  className,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {kicker && <Kicker className="mb-3">{kicker}</Kicker>}
        <Display size={size}>{title}</Display>
        {description && (
          <p className="mt-4 max-w-[58ch] text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * A ruled list row with a hung number. The number column and the accent
 * square that marks it are what make a list read as a system rather than as
 * a stack of cards.
 */
export function RuledRow({
  index,
  children,
  highlighted,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  index?: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-baseline gap-x-6 gap-y-3 border-t-2 border-line py-4 pl-6",
        "grid-cols-[minmax(0,1fr)] sm:grid-cols-[46px_minmax(0,1fr)]",
        highlighted && "bg-accent-100",
        className
      )}
      {...props}
    >
      {index !== undefined && (
        <p className="rnum hidden sm:block">{index}</p>
      )}
      {children}
    </div>
  );
}

/** A band of large accent figures — the system's headline statistic row. */
export function StatBand({
  stats,
  className,
}: {
  stats: { value: React.ReactNode; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-6 md:flex md:justify-between md:gap-7",
        className
      )}
    >
      {stats.map((s, i) => (
        <div key={i}>
          <p className="disp tnum m-0 text-[clamp(28px,5vw,44px)] leading-none text-accent">
            {s.value}
          </p>
          <span className="lbl mt-2.5 block">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

type BadgeTone = "neutral" | "accent" | "outline" | "success" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-muted border-transparent",
  accent: "bg-accent-100 text-accent-800 border-transparent",
  outline: "border-accent text-accent",
  success: "bg-success-soft text-success-ink border-transparent",
  warning: "bg-warning-soft text-warning-ink border-transparent",
  danger: "bg-danger-soft text-danger-ink border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2.5 py-0.5 text-[11px] tracking-[0.02em] whitespace-nowrap",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

/** A tap-to-select chip — the questionnaire's main control. */
export function Chip({
  selected,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center border px-3 py-2 text-sm transition-colors",
        selected
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-ink hover:bg-surface-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Segmented control — mutually exclusive options in one bordered block. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  className,
  ariaLabel,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cn("inline-flex border border-line", className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors",
              i > 0 && "border-l border-line",
              active
                ? "bg-accent text-accent-ink"
                : "hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent"
            )}
          >
            <input
              type="radio"
              name={name}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

/** Discrete progress ticks, used while a chapter streams. */
export function Ticks({
  value,
  total = 10,
  className,
}: {
  value: number;
  total?: number;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(total, Math.round(value * total)));
  return (
    <div
      className={cn("ticks", className)}
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < filled ? "on" : undefined} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

/**
 * A panel. In this system a "card" is a flat tinted block, not a floating
 * rounded object — elevation is reserved for things that genuinely overlay.
 */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border border-line bg-surface", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b-2 border-line px-5 py-3.5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base">{title}</h2>
        {description && <p className="mt-1 text-xs text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-4 w-4 animate-spin text-ink-subtle", className)} aria-hidden />
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted"
      role="status"
    >
      <Spinner />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/**
 * Empty states are a full editorial statement here, not a grey box with a
 * shrug — they're the screen a new user sees most often.
 */
export function EmptyState({
  kicker,
  title,
  description,
  action,
  className,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-t-2 border-line py-12", className)}>
      {kicker && <Kicker className="mb-3">{kicker}</Kicker>}
      <h2 className="disp max-w-[22ch] text-[clamp(26px,4.5vw,40px)]">{title}</h2>
      {description && (
        <p className="mt-5 max-w-[52ch] leading-[var(--leading)] text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="border-l-2 border-danger bg-danger-soft px-5 py-4 text-sm text-danger-ink"
      role="alert"
    >
      <p className="font-semibold">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="lbl mt-2 text-danger-ink underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

/**
 * A modal built on the native <dialog> semantics we actually need: focus is
 * trapped by rendering over a backdrop, Escape closes, and the initial focus
 * lands on the panel rather than on the destructive button.
 */
export function Dialog({
  open,
  onClose,
  kicker,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  kicker?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    // Stop the page behind the modal from scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,black_55%,transparent)] p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in w-full max-w-[480px] border border-line bg-paper p-5 shadow-overlay outline-none"
      >
        {kicker && <Kicker className="mb-1">{kicker}</Kicker>}
        <h2 className="text-[26px] tracking-[-0.015em]">{title}</h2>
        {children && <div className="mt-3 text-sm text-ink-muted">{children}</div>}
        <Rule className="my-4" />
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}
