"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button, Kicker, Rule } from "./ui";

/** Initials for the square avatar — one letter from each of the first two words. */
function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const user = session?.user;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-[30px] w-[30px] place-items-center bg-ink font-display text-[11px] font-extrabold text-paper transition-opacity hover:opacity-85"
      >
        {user ? initials(user.name, user.email) : <User className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 z-50 mt-2 w-60 border border-line bg-paper p-4 shadow-overlay"
        >
          <Kicker>Signed in</Kicker>
          <p className="mt-1 truncate font-display text-sm font-extrabold text-ink">
            {user?.name || "Your account"}
          </p>
          {user?.email && (
            <p className="mono mt-1 truncate text-ink-muted">{user.email}</p>
          )}
          <Rule className="my-3" />
          <Button
            variant="secondary"
            size="sm"
            role="menuitem"
            className="w-full justify-center"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
