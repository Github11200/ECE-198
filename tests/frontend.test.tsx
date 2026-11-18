// The SvelteKit frontend's Convex subscriptions (frontend/src/lib/*.ts) must name public,
// token-protected queries with the argument/return shapes it uses. UI behaviour itself is
// tested by the frontend's own suite in frontend/src/tests (the React version of this file
// tested modules removed by the Svelte migration).
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.js");
const token = "test-read-token";
const root = resolve(__dirname, "..");
let t: ReturnType<typeof convexTest>;
beforeEach(() => { t = convexTest(schema, modules); vi.stubEnv("FEEDBACK_READ_TOKEN", token); });
afterEach(() => vi.unstubAllEnvs());

describe("SvelteKit frontend subscriptions", () => {
  const lib = resolve(root, "frontend/src/lib");
  const sources = readdirSync(lib).filter(f => f.endsWith(".ts")).map(f => readFileSync(resolve(lib, f), "utf8")).join("\n");
  const references = [...sources.matchAll(/makeFunctionReference<\s*'(\w+)'[\s\S]*?>\(\s*'([\w:]+)'\s*\)/g)]
    .map(([, type, name]) => ({ type, name }));
  it("finds the frontend's Convex references", () => {
    expect(references.map(r => r.name).sort()).toEqual(["archive:history", "archive:personHistory", "feedback:live"]);
  });
  it.each(["archive:history", "archive:personHistory", "feedback:live"])("%s is a public, token-protected query", async name => {
    const [module, fn] = name.split(":");
    const registered = (await import(`../convex/${module}.js`))[fn];
    expect(registered.isQuery && registered.isPublic).toBe(true);
    const args = { token, ...(module === "archive" ? { paginationOpts: { numItems: 20, cursor: null } } : {}),
      ...(fn === "personHistory" ? { participantId: "P01" } : {}) };
    const result = await t.query(anyApi[module][fn], args);
    if (module === "archive") expect(Object.keys(result).sort()).toEqual(["continueCursor", "isDone", "page"]);
    else expect(result).toBeNull();
    await expect(t.query(anyApi[module][fn], { ...args, token: "wrong" })).rejects.toThrow("token");
  });
});
