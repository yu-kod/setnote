import { describe, it, expect } from "vitest";
import {
  shrinkToFit,
  thumbnailSizeFor,
  rowPaddingFor,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
} from "./listLayout";

describe("shrinkToFit", () => {
  it("実測した高さが収まっていれば縮めない", () => {
    expect(shrinkToFit(MAX_FONT_SIZE, 500, 600)).toBeNull();
    expect(shrinkToFit(MAX_FONT_SIZE, 600, 600)).toBeNull();
  });

  it("はみ出していれば文字サイズを下げる", () => {
    const next = shrinkToFit(MAX_FONT_SIZE, 800, 600);

    expect(next).not.toBeNull();
    expect(next!).toBeLessThan(MAX_FONT_SIZE);
  });

  it("はみ出し量が小さくても必ず1px以上下げて収束させる", () => {
    // 比で見積もると 13.98px となり、切り捨てても同じ値に留まりかねない。
    expect(shrinkToFit(14, 601, 600)).toBe(13);
  });

  it("下限を下回る値は返さない", () => {
    expect(shrinkToFit(MIN_FONT_SIZE + 1, 6000, 600)).toBe(MIN_FONT_SIZE);
  });

  it("下限まで縮めたらそれ以上は縮めない", () => {
    expect(shrinkToFit(MIN_FONT_SIZE, 6000, 600)).toBeNull();
  });

  // 高さを測る前（初回レンダー）に0が渡ってくる。
  it("高さが不明なら縮めない", () => {
    expect(shrinkToFit(MAX_FONT_SIZE, 800, 0)).toBeNull();
  });
});

describe("thumbnailSizeFor", () => {
  it("文字サイズに合わせてサムネイルも縮む", () => {
    const large = thumbnailSizeFor(MAX_FONT_SIZE);
    const small = thumbnailSizeFor(MIN_FONT_SIZE);

    expect(small.height).toBeLessThan(large.height);
    expect(large.width).toBe(large.height * 2);
  });
});

describe("rowPaddingFor", () => {
  it("文字サイズに合わせて行の余白も詰める", () => {
    expect(rowPaddingFor(MIN_FONT_SIZE)).toBeLessThan(rowPaddingFor(MAX_FONT_SIZE));
  });

  it("詰めても余白は残す", () => {
    expect(rowPaddingFor(MIN_FONT_SIZE)).toBeGreaterThan(0);
  });
});
