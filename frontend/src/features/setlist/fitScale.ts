// 一覧表示をスクロールせず1画面に収めるための縮小率を求める。

/** これ以上小さくすると曲名が読めなくなるため、縮小の下限とする。 */
export const MIN_FIT_SCALE = 0.4;

/**
 * naturalHeight（等倍での実際の高さ）を availableHeight に収めるための倍率を返す。
 * 収まっている場合は拡大せず等倍のままにする。
 */
export function computeFitScale(naturalHeight: number, availableHeight: number): number {
  if (naturalHeight <= 0) return 1;
  const ratio = availableHeight / naturalHeight;
  if (ratio >= 1) return 1;
  // 浮動小数の誤差で 0.58 が 0.5799... になり1段階小さくなるのを防ぐ。
  return Math.max(MIN_FIT_SCALE, Math.floor(ratio * 100 + 1e-9) / 100);
}
