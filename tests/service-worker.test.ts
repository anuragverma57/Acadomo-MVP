import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The service worker is plain JS with no build step, so its rules are tested by
 * extracting the function and exercising it directly.
 *
 * What this guards: a cached authenticated response would be served to whoever
 * opens the app next — including a signed-out visitor on a shared device.
 */

const source = readFileSync("public/sw.js", "utf8");

// The worker reads self.location.origin to reject third-party requests, so the
// harness supplies a `self` standing in for the deployed origin.
const shouldBypass = new Function(
  "self",
  `${source.slice(
    source.indexOf("function shouldBypass"),
    source.indexOf("async function cacheFirst"),
  )}; return shouldBypass;`,
)({ location: { origin: "https://acadomo.app" } }) as (
  request: unknown,
  url: URL,
) => boolean;

function check(path: string, method = "GET", headers: Record<string, string> = {}) {
  return shouldBypass(
    { method, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } },
    new URL(path, "https://acadomo.app"),
  );
}

describe("service worker cache bypass", () => {
  it.each([
    ["/api/auth/request-otp", "POST"],
    ["/api/auth/verify-otp", "POST"],
    ["/api/auth/logout", "POST"],
    ["/api/admin/enquiries", "GET"],
    ["/api/admin/login", "POST"],
    ["/api/admin/enquiries/1", "PATCH"],
    ["/api/saved/3", "POST"],
    ["/api/saved/3", "DELETE"],
    ["/admin", "GET"],
    ["/admin/login", "GET"],
    ["/account", "GET"],
    ["/saved", "GET"],
    ["/signup", "GET"],
    ["/api/enquiries", "POST"],
  ])("never caches %s (%s)", (path, method) => {
    expect(check(path, method)).toBe(true);
  });

  it.each([
    "/",
    "/properties/some-slug",
    "/api/properties",
    "/api/properties?city=London",
    "/_next/static/chunk.js",
    "/icons/icon-192.png",
  ])("allows caching of public GET %s", (path) => {
    expect(check(path)).toBe(false);
  });

  it("bypasses any request carrying an Authorization header", () => {
    expect(check("/api/properties", "GET", { authorization: "Bearer x" })).toBe(true);
  });

  it("bypasses every non-GET method", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(check("/", method)).toBe(true);
    }
  });

  it("bypasses third-party origins but allows the image host", () => {
    expect(shouldBypass(
      { method: "GET", headers: { get: () => null } },
      new URL("https://evil.example.com/x.js"),
    )).toBe(true);
    expect(shouldBypass(
      { method: "GET", headers: { get: () => null } },
      new URL("https://images.unsplash.com/photo-1.jpg"),
    )).toBe(false);
  });
});

describe("service worker hygiene", () => {
  it("versions every cache name", () => {
    expect(source).toMatch(/const CACHE_VERSION = "v\d+"/);
    for (const name of ["SHELL_CACHE", "IMAGE_CACHE", "DATA_CACHE"]) {
      expect(source).toMatch(new RegExp(`${name} = \`[^\`]*\\$\\{CACHE_VERSION\\}\``));
    }
  });

  it("deletes non-matching caches on activate", () => {
    expect(source).toContain("caches.delete");
    expect(source).toContain("!key.endsWith(CACHE_VERSION)");
  });

  it("caps the image cache", () => {
    expect(source).toMatch(/MAX_IMAGE_ENTRIES = \d+/);
  });
});
