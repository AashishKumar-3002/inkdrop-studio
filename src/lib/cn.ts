/**
 * Joins class names, dropping falsy entries.
 *
 * Lives in its own module (not in the UI kit) because the UI kit is a
 * "use client" file, and a server component that imports a value from a
 * client module gets a client reference it cannot call.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
