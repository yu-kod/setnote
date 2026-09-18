import { describe, it, expect } from "vitest";
import { isListViewRoute } from "./listView";

describe("isListViewRoute", () => {
  it("公開ページの一覧表示なら真", () => {
    expect(isListViewRoute("/s/abc123", "?view=list")).toBe(true);
  });

  it("公開ページでも通常表示なら偽", () => {
    expect(isListViewRoute("/s/abc123", "")).toBe(false);
    expect(isListViewRoute("/s/abc123", "?view=normal")).toBe(false);
  });

  it("公開ページ以外では偽", () => {
    expect(isListViewRoute("/dashboard", "?view=list")).toBe(false);
  });
});
