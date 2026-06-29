import { describe, it, expect } from "vitest";
import { resolveBackground, isAnimatedAurora } from "@/lib/theme-background";

describe("isAnimatedAurora", () => {
  it("returns true only for the aurora type", () => {
    expect(isAnimatedAurora({ backgroundType: "aurora" })).toBe(true);
    expect(isAnimatedAurora({ backgroundType: "gradient" })).toBe(false);
    expect(isAnimatedAurora({ backgroundType: null })).toBe(false);
    expect(isAnimatedAurora({})).toBe(false);
  });
});

describe("resolveBackground", () => {
  it("renders a solid background", () => {
    expect(
      resolveBackground({ backgroundType: "solid", backgroundValue: "#07060c" }),
    ).toBe("#07060c");
  });

  it("renders a multi-stop gradient", () => {
    const out = resolveBackground({
      backgroundType: "gradient",
      backgroundValue: "#1a1530,#2a2150",
    });
    expect(out).toBe("linear-gradient(160deg, #1a1530, #2a2150)");
  });

  it("renders a single-value gradient as a flat color", () => {
    expect(
      resolveBackground({ backgroundType: "gradient", backgroundValue: "#0a0820" }),
    ).toBe("#0a0820");
  });

  it("defaults to the night base when value is missing", () => {
    expect(resolveBackground({ backgroundType: "gradient" })).toBe("#0a0820");
    expect(resolveBackground({})).toBe("#0a0820");
  });

  it("treats pattern like a flat color", () => {
    expect(
      resolveBackground({ backgroundType: "pattern", backgroundValue: "#111" }),
    ).toBe("#111");
  });
});
