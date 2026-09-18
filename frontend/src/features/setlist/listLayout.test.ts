import { describe, it, expect } from "vitest";
import { computeRowLayout, MAX_ROW_HEIGHT, MIN_ROW_HEIGHT } from "./listLayout";

describe("computeRowLayout", () => {
  it("曲数が少なければ行を広げすぎない", () => {
    const layout = computeRowLayout(600, 3);

    expect(layout.rowHeight).toBe(MAX_ROW_HEIGHT);
  });

  it("曲数が多ければ1画面に収まるまで行を縮める", () => {
    const layout = computeRowLayout(600, 30);

    expect(layout.rowHeight).toBe(20);
    expect(layout.rowHeight * 30).toBeLessThanOrEqual(600);
  });

  it("縮めても収まらない場合は下限で止める", () => {
    const layout = computeRowLayout(100, 30);

    expect(layout.rowHeight).toBe(MIN_ROW_HEIGHT);
  });

  it("行の高さに合わせて文字も縮める", () => {
    const small = computeRowLayout(100, 30);
    const large = computeRowLayout(600, 3);

    expect(small.fontSize).toBeLessThan(large.fontSize);
  });

  // 高さを測る前（初回レンダー）や曲がない場合でも破綻させない。
  it("高さが不明なら既定の行の高さを返す", () => {
    expect(computeRowLayout(0, 10).rowHeight).toBe(MAX_ROW_HEIGHT);
    expect(computeRowLayout(600, 0).rowHeight).toBe(MAX_ROW_HEIGHT);
  });
});
