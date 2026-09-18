import { describe, it, expect } from "vitest";
import { computeFitScale, MIN_FIT_SCALE } from "./fitScale";

describe("computeFitScale", () => {
  it("すでに収まっているときは等倍のまま", () => {
    expect(computeFitScale(300, 600)).toBe(1);
  });

  it("ちょうど収まるときも等倍のまま", () => {
    expect(computeFitScale(600, 600)).toBe(1);
  });

  it("はみ出すときは画面に収まる倍率を返す", () => {
    expect(computeFitScale(1000, 500)).toBe(0.5);
  });

  // 切り上げると端数のぶん1px単位ではみ出しうるので、切り捨てる。
  it("端数は切り捨てる", () => {
    expect(computeFitScale(1000, 555)).toBe(0.55);
  });

  it("読めなくなるため下限より小さくはしない", () => {
    expect(computeFitScale(1000, 100)).toBe(MIN_FIT_SCALE);
  });

  // 描画前など高さが取れない場合に 0 除算で NaN を返さないようにする。
  it("高さが測れないときは等倍を返す", () => {
    expect(computeFitScale(0, 600)).toBe(1);
  });
});
