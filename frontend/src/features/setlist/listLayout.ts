// 一覧表示は「スクリーンショットを撮って共有する」ための表示なので、
// スクロールせずに全曲が1画面へ収まることを優先する。
// 端末ごとに画面の高さが違うため、行の高さは実測値から動的に決める。

/** これ以上広げても読みやすさが上がらない行の高さ。 */
export const MAX_ROW_HEIGHT = 36;
/** これ以上詰めると文字が潰れて読めなくなる行の高さ。 */
export const MIN_ROW_HEIGHT = 16;

export type RowLayout = {
  rowHeight: number;
  fontSize: number;
};

function fontSizeFor(rowHeight: number): number {
  return Math.min(14, Math.max(9, Math.round(rowHeight * 0.45)));
}

/**
 * 使える高さと曲数から1行あたりの高さを決める。
 * 高さが未測定（0以下）や曲が0件のときは既定値を返す。
 */
export function computeRowLayout(availableHeight: number, trackCount: number): RowLayout {
  if (availableHeight <= 0 || trackCount <= 0) {
    return { rowHeight: MAX_ROW_HEIGHT, fontSize: fontSizeFor(MAX_ROW_HEIGHT) };
  }
  const fitted = Math.floor(availableHeight / trackCount);
  const rowHeight = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, fitted));
  return { rowHeight, fontSize: fontSizeFor(rowHeight) };
}
