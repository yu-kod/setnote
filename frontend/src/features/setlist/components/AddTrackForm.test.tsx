import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test-utils";
import { AddTrackForm } from "./AddTrackForm";

const onAdd = vi.fn();

beforeEach(() => {
  onAdd.mockReset();
});

describe("AddTrackForm", () => {
  it("shows only the add button initially", () => {
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    expect(screen.getByRole("button", { name: "トラックを追加" })).toBeInTheDocument();
    expect(screen.queryByLabelText("曲名")).not.toBeInTheDocument();
  });

  it("expands the form when the add button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));

    expect(screen.getByLabelText("曲名")).toBeInTheDocument();
  });

  it("disables submit until a title is entered", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();

    await user.type(screen.getByLabelText("曲名"), "New Song");
    expect(screen.getByRole("button", { name: "追加" })).toBeEnabled();
  });

  it("calls onAdd with a new track and collapses when submitted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.type(screen.getByLabelText("曲名"), "New Song");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      title: "New Song",
      artist: "",
      customFields: [],
    });
    expect(onAdd.mock.calls[0][0].id).toBeTruthy();
    expect(screen.getByRole("button", { name: "トラックを追加" })).toBeInTheDocument();
    expect(screen.queryByLabelText("曲名")).not.toBeInTheDocument();
  });

  it("collapses without adding when cancelled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.type(screen.getByLabelText("曲名"), "Discard");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "トラックを追加" })).toBeInTheDocument();
  });
});
