"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "./ui";

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
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
      >
        {user ? initial : <User className="h-4 w-4" />}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-overlay"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">
              {user?.name || "Signed in"}
            </p>
            {user?.email && (
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            role="menuitem"
            className="mt-1 w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
