// 一覧表示は「スクリーンショットを撮って共有する」ための表示なので、
// スクロールせずに全曲が1画面へ収まることを優先する。
//
// 使える高さを曲数で割って1行の高さを決め打ちすると、
// 長い曲名や作者名が折り返した行だけが高さ不足になり、中身がはみ出して下の行と重なる。
// そのため行の高さは中身に任せ、実際に描画された高さを測ってから文字サイズだけを下げる。
export const MAX_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 9;

/**
 * 実測した高さ（measuredHeight）が使える高さ（availableHeight）へ収まるように、
 * 次に試す文字サイズを返す。すでに収まっている・これ以上小さくできない場合は null。
 */
export function shrinkToFit(
  fontSize: number,
  measuredHeight: number,
  availableHeight: number
): number | null {
  if (availableHeight <= 0) return null;
  if (measuredHeight <= availableHeight) return null;
  if (fontSize <= MIN_FONT_SIZE) return null;
  // 高さは文字サイズにほぼ比例するので、比から次の候補を見積もって一気に近づける。
  // ただし折り返しが減る分だけ見積もりより縮まないため、必ず1px以上下げて収束を保証する。
  const estimate = Math.floor((fontSize * availableHeight) / measuredHeight);
  return Math.max(MIN_FONT_SIZE, Math.min(fontSize - 1, estimate));
}

/** 一覧表示のサムネイルの大きさ。文字サイズに合わせて縮める。 */
export function thumbnailSizeFor(fontSize: number): { height: number; width: number } {
  const height = Math.round(fontSize * 1.8);
  return { height, width: height * 2 };
}

/**
 * 一覧表示の行の上下の余白。
 * 文字を小さくしたのに余白だけ据え置きだと、そこだけが高さを食って行数を稼げない。
 */
export function rowPaddingFor(fontSize: number): number {
  return Math.round(fontSize * 0.35);
}
