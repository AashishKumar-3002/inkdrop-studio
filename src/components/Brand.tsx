import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
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

export function Wordmark({
  href = "/",
  size = 28,
  className,
}: {
  href?: string | null;
  size?: number;
  className?: string;
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="text-base font-semibold tracking-tight text-ink">
        Inkdrop <span className="text-ink-muted font-normal">Studio</span>
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="rounded-lg">
      {inner}
    </Link>
  ) : (
    inner
  );
}
