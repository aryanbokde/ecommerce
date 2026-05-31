import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("merges multiple class names into a single string", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("ignores empty strings, undefined, null and false", () => {
    expect(cn("", undefined, null, false, "valid")).toBe("valid");
    expect(cn()).toBe("");
    expect(cn(undefined, null, false)).toBe("");
  });

  it("resolves Tailwind conflicts — last value wins", () => {
    // padding conflict
    expect(cn("p-4", "p-2")).toBe("p-2");
    // text-color conflict
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    // conditional override: false branch is ignored, truthy branch wins
    expect(cn("px-2 py-1", { "px-4": true, "py-1": false })).toBe("py-1 px-4");
  });
});
