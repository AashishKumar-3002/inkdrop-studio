import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";

const BASE = "https://inkdrop.test";

function request(
  path: string,
  opts: { signedIn?: boolean; mode?: string } = {}
): NextRequest {
  const headers = new Headers();
  if (opts.signedIn) headers.set("cookie", "authjs.session-token=abc");
  // Browsers send this on every request; "navigate" only for a real page load.
  if (opts.mode !== undefined) headers.set("sec-fetch-mode", opts.mode);
  return new NextRequest(new URL(path, BASE), { headers });
}

/** Where the proxy is sending this request, or null if it lets it through. */
function destination(res: Response): string | null {
  const location = res.headers.get("location");
  return location ? new URL(location, BASE).pathname + new URL(location, BASE).search : null;
}

describe("route protection", () => {
  it("bounces signed-out visitors off protected routes, remembering where they were going", () => {
    const res = proxy(request("/project/abc/chapters", { mode: "navigate" }));
    expect(destination(res)).toBe("/login?callbackUrl=%2Fproject%2Fabc%2Fchapters");
  });

  it("lets signed-in visitors through to protected routes", () => {
    const res = proxy(request("/dashboard", { signedIn: true, mode: "navigate" }));
    expect(destination(res)).toBeNull();
  });

  it("sends a signed-in visitor who navigates to /login on to the dashboard", () => {
    const res = proxy(request("/login", { signedIn: true, mode: "navigate" }));
    expect(destination(res)).toBe("/dashboard");
  });

  it("leaves the router's background fetches of /login alone", () => {
    // Next strips the RSC and prefetch headers before the proxy runs, so
    // fetch metadata is the only way to tell a prefetch from a navigation.
    // Redirecting one produces a hop the browser follows without the RSC
    // headers, and it caches the resulting 404 as the destination's payload.
    const res = proxy(request("/register", { signedIn: true, mode: "cors" }));
    expect(destination(res)).toBeNull();
  });

  it("still redirects when the browser sends no fetch metadata", () => {
    const res = proxy(request("/login", { signedIn: true }));
    expect(destination(res)).toBe("/dashboard");
  });

  it("leaves public routes alone either way", () => {
    expect(destination(proxy(request("/", { mode: "navigate" })))).toBeNull();
    expect(
      destination(proxy(request("/", { signedIn: true, mode: "navigate" })))
    ).toBeNull();
  });
});
