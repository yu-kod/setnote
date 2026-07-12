import { describe, it, expect } from "vitest";
import { toViewRows } from "./views";

describe("toViewRows", () => {
  it("returns an empty array for no setlists", () => {
    expect(toViewRows([])).toEqual([]);
  });

  it("maps setlists to id/name/viewCount and sorts by views desc", () => {
    const result = toViewRows([
      { id: "a", name: "Set A", viewCount: 3 },
      { id: "b", name: "Set B", viewCount: 10 },
    ]);

    expect(result).toEqual([
      { id: "b", name: "Set B", viewCount: 10 },
      { id: "a", name: "Set A", viewCount: 3 },
    ]);
  });

  it("defaults a missing viewCount to 0", () => {
    const result = toViewRows([{ id: "a", name: "Set A" }]);
    expect(result).toEqual([{ id: "a", name: "Set A", viewCount: 0 }]);
  });

  it("breaks ties by name ascending", () => {
    const result = toViewRows([
      { id: "b", name: "B", viewCount: 5 },
      { id: "a", name: "A", viewCount: 5 },
    ]);
    expect(result.map((r) => r.name)).toEqual(["A", "B"]);
  });

  it("tolerates missing id and name fields", () => {
    expect(toViewRows([{}])).toEqual([{ id: "", name: "", viewCount: 0 }]);
  });
});
