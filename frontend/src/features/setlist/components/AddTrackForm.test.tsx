import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test-utils";
import { AddTrackForm } from "./AddTrackForm";

const onAdd = vi.fn();

beforeEach(() => {
  onAdd.mockReset();
});

describe("AddTrackForm", () => {
  it("renders a button labeled トラックを追加", () => {
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    expect(screen.getByRole("button", { name: "トラックを追加" })).toBeInTheDocument();
  });

  it("calls onAdd with an empty track when clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const added = onAdd.mock.calls[0][0];
    expect(added.id).toBeTruthy();
    expect(added.title).toBe("");
    expect(added.artist).toBe("");
    expect(added.customFields).toEqual([]);
  });

  it("calls onAdd once per click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.click(screen.getByRole("button", { name: "トラックを追加" }));

    expect(onAdd).toHaveBeenCalledTimes(2);
  });
});
