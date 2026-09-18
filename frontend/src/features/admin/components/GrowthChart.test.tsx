import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GrowthChart } from "./GrowthChart";

describe("GrowthChart", () => {
  it("labels the chart and plots one point per day", () => {
    render(
      <GrowthChart
        label="ユーザー数の推移"
        points={[
          { date: "2026-09-16", value: 1 },
          { date: "2026-09-17", value: 3 },
          { date: "2026-09-18", value: 4 },
        ]}
      />
    );

    const chart = screen.getByRole("img", { name: /ユーザー数の推移/ });
    expect(chart).toBeInTheDocument();
    expect(chart.querySelectorAll("circle")).toHaveLength(3);
  });

  it("shows the first and last day under the chart", () => {
    render(
      <GrowthChart
        label="ユーザー数の推移"
        points={[
          { date: "2026-09-16", value: 1 },
          { date: "2026-09-18", value: 4 },
        ]}
      />
    );

    expect(screen.getByText("2026-09-16")).toBeInTheDocument();
    expect(screen.getByText("2026-09-18")).toBeInTheDocument();
  });

  it("keeps a flat line when every value is the same", () => {
    render(
      <GrowthChart
        label="ユーザー数の推移"
        points={[
          { date: "2026-09-17", value: 0 },
          { date: "2026-09-18", value: 0 },
        ]}
      />
    );

    const line = screen.getByRole("img", { name: /ユーザー数の推移/ }).querySelector("polyline");
    expect(line?.getAttribute("points")).toBe("0,50 100,50");
  });

  it("renders an empty state when there is nothing to plot", () => {
    render(<GrowthChart label="ユーザー数の推移" points={[]} />);

    expect(screen.getByText("データがありません")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("plots a single day without dividing by zero", () => {
    render(<GrowthChart label="ユーザー数の推移" points={[{ date: "2026-09-18", value: 2 }]} />);

    const line = screen.getByRole("img", { name: /ユーザー数の推移/ }).querySelector("polyline");
    expect(line?.getAttribute("points")).toBe("0,50");
  });

  it("scales the line between the smallest and largest value", () => {
    render(
      <GrowthChart
        label="ユーザー数の推移"
        points={[
          { date: "2026-09-17", value: 0 },
          { date: "2026-09-18", value: 10 },
        ]}
      />
    );

    const line = screen.getByRole("img", { name: /ユーザー数の推移/ }).querySelector("polyline");
    expect(line?.getAttribute("points")).toBe("0,96 100,4");
  });
});
