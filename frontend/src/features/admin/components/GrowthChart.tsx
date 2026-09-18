export type ChartPoint = {
  date: string;
  value: number;
};

type GrowthChartProps = {
  label: string;
  points: ChartPoint[];
};

/** 折れ線が枠に張り付かないようにする上下の余白。 */
const PADDING = 4;
const HEIGHT = 100;
const WIDTH = 100;

/**
 * 日次の推移を描く軽量な折れ線グラフ。
 * 外部のチャートライブラリを増やさないため、インライン SVG で描いている。
 */
export function GrowthChart({ label, points }: GrowthChartProps) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">データがありません</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const xFor = (i: number) => (points.length === 1 ? 0 : (i / (points.length - 1)) * WIDTH);
  // すべて同じ値のときは真ん中に水平線を引く（0除算を避ける）。
  const yFor = (value: number) =>
    max === min ? HEIGHT / 2 : PADDING + (1 - (value - min) / (max - min)) * (HEIGHT - PADDING * 2);

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), point: p }));

  return (
    <div>
      <svg
        role="img"
        aria-label={`${label}（${points[0].date} 〜 ${points[points.length - 1].date}）`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
      >
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
        {coords.map((c) => (
          <circle key={c.point.date} cx={c.x} cy={c.y} r={1.5} className="fill-primary" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}
