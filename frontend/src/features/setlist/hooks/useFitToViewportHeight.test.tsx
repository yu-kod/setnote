import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useFitToViewportHeight } from "./useFitToViewportHeight";
import { MIN_FIT_SCALE } from "../fitScale";

// jsdom は実レイアウトを持たないため、測定に使う値だけを差し替える。
const VIEWPORT_HEIGHT = 600;

/**
 * 対象要素の等倍での高さと、測るたびに返すページのはみ出し量を仕込む。
 * overflows は先頭から順に使われ、尽きたら最後の値を返し続ける。
 */
function stubLayout({ natural, overflows }: { natural: number; overflows: number[] }) {
  const queue = [...overflows];
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(natural);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(VIEWPORT_HEIGHT);
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
    () => VIEWPORT_HEIGHT + (queue.length > 1 ? queue.shift()! : queue[0])
  );
}

function Harness({ enabled, showBox = true }: { enabled: boolean; showBox?: boolean }) {
  const ref = useFitToViewportHeight<HTMLDivElement>(enabled, showBox);
  return showBox ? <div ref={ref} data-testid="box" /> : null;
}

const box = () => screen.getByTestId("box");

describe("useFitToViewportHeight", () => {
  it("すでに収まっているときは縮小しない", () => {
    stubLayout({ natural: 1000, overflows: [0] });

    render(<Harness enabled />);

    expect(box().style.zoom).toBe("1");
  });

  it("はみ出したぶんだけ縮小する", () => {
    // 1000 のうち 400 がはみ出しているので、使える高さは 600 で 0.6 倍。
    stubLayout({ natural: 1000, overflows: [400, 0] });

    render(<Harness enabled />);

    expect(box().style.zoom).toBe("0.6");
  });

  // 縮小すると枠線などの端数が積み上がり、計算どおりの高さにならないことがある。
  it("縮小してもまだはみ出すときはさらに詰める", () => {
    stubLayout({ natural: 1000, overflows: [400, 20, 0] });

    render(<Harness enabled />);

    // 0.6 倍で 20 はみ出したので、600 - 20 = 580 → 0.58 倍。
    expect(box().style.zoom).toBe("0.58");
  });

  it("詰めきれないときは下限で止める", () => {
    stubLayout({ natural: 1000, overflows: [400] });

    render(<Harness enabled />);

    expect(box().style.zoom).toBe(String(MIN_FIT_SCALE));
  });

  it("無効のときは倍率を触らない", () => {
    stubLayout({ natural: 1000, overflows: [400, 0] });

    render(<Harness enabled={false} />);

    expect(box().style.zoom).toBe("");
  });

  it("無効に切り替えると等倍に戻す", () => {
    stubLayout({ natural: 1000, overflows: [400, 0] });
    const { rerender } = render(<Harness enabled />);

    rerender(<Harness enabled={false} />);

    expect(box().style.zoom).toBe("");
  });

  it("画面サイズが変わったら測り直す", () => {
    stubLayout({ natural: 1000, overflows: [400, 0] });
    render(<Harness enabled />);

    vi.restoreAllMocks();
    stubLayout({ natural: 1000, overflows: [500, 0] });
    window.dispatchEvent(new Event("resize"));

    expect(box().style.zoom).toBe("0.5");
  });

  it("対象がまだ描画されていなくても落ちない", () => {
    stubLayout({ natural: 1000, overflows: [400, 0] });

    const { rerender } = render(<Harness enabled showBox={false} />);
    expect(screen.queryByTestId("box")).not.toBeInTheDocument();

    // 描画されたタイミングで測り直される。
    rerender(<Harness enabled showBox />);
    expect(box().style.zoom).toBe("0.6");
  });
});
