import { useLayoutEffect, useRef } from "react";
import { computeFitScale } from "../fitScale";

/** 端数の積み上がりを詰め直す回数の上限。1〜2回で収束するが、念のため余裕を持たせる。 */
const FIT_PASSES = 4;

/** ページ全体が縦にはみ出している量（px）。0以下なら1画面に収まっている。 */
function pageOverflow(): number {
  const root = document.documentElement;
  return root.scrollHeight - root.clientHeight;
}

/**
 * 要素が縦方向で1画面に収まるよう、CSS の zoom で縮小する。
 *
 * 一覧表示をスクロールなしで見渡す（＝そのままスクリーンショットを撮れる）ための仕組み。
 * transform: scale ではなく zoom を使うのは、縮小後の高さがレイアウトに反映され、
 * 下に余白が残ったり要素が重なったりしないため。
 *
 * revision が変わると測り直す。中身が差し替わったとき（読み込み完了など）に渡す。
 */
export function useFitToViewportHeight<T extends HTMLElement>(enabled: boolean, revision: unknown) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    if (!enabled) return;

    const fit = () => {
      const el = ref.current;
      if (!el) return;

      // 測定は必ず等倍から始める。前回の縮小率が残っていると値がずれていく。
      el.style.zoom = "1";
      // 等倍での実際の高さ。scrollHeight はボーダーを含まないため offsetHeight を使う。
      const natural = el.offsetHeight;
      // いま要素が占めている高さから、ページのはみ出しぶんを引いたものが使える高さ。
      let available = natural - pageOverflow();
      let scale = computeFitScale(natural, available);
      el.style.zoom = String(scale);

      // 縮小するとボーダーなどの端数が積み上がり、計算より数px高くなることがある。
      // 実測のはみ出しぶんを引いて、収まるまで詰め直す。
      for (let pass = 1; pass < FIT_PASSES; pass++) {
        const overflow = pageOverflow();
        if (overflow <= 0) break;
        available = natural * scale - overflow;
        scale = computeFitScale(natural, available);
        el.style.zoom = String(scale);
      }
    };

    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      const el = ref.current;
      if (el) el.style.zoom = "";
    };
  }, [enabled, revision]);

  return ref;
}
