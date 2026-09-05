import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}

/**
 * The wordmark. Set in the display face at its heaviest weight with tight
 * tracking — in this system the brand is the typography, so it needs no box
 * or badge around it.
 */
export function Wordmark({
  href = "/",
  size = 17,
  short = false,
  className,
}: {
  href?: string | null;
  size?: number;
  short?: boolean;
  className?: string;
}) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display font-extrabold tracking-[-0.01em] text-ink",
        className
      )}
      style={{ fontSize: size }}
    >
      <Logo size={Math.round(size * 0.95)} />
      {short ? "Inkdrop" : "Inkdrop Studio"}
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
