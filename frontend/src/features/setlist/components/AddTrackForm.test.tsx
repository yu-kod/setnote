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

  it("suggests matching past tracks and hides suggestions when nothing matches", async () => {
    const suggestions = [
      {
        id: "p1",
        title: "Song A",
        artist: "DJ X",
        songLink: "https://youtu.be/1",
        source: "shop",
        customFields: [],
      },
      { id: "p2", title: "Song B", artist: "", songLink: "", source: "", customFields: [] },
    ];
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} suggestions={suggestions} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.type(screen.getByLabelText("曲名"), "Song");

    expect(screen.getByRole("option", { name: /Song A/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Song B/ })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("曲名"));
    await user.type(screen.getByLabelText("曲名"), "zzz");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("adds a full copy of a selected suggestion with a new id", async () => {
    const suggestions = [
      {
        id: "p1",
        title: "Song A",
        artist: "DJ X",
        songLink: "https://youtu.be/1",
        source: "shop",
        customFields: [{ id: "c1", label: "BPM", value: "128" }],
      },
    ];
    const user = userEvent.setup();
    renderWithProviders(<AddTrackForm onAdd={onAdd} suggestions={suggestions} />);

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.type(screen.getByLabelText("曲名"), "Song");
    await user.click(screen.getByRole("option", { name: /Song A/ }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const added = onAdd.mock.calls[0][0];
    expect(added).toMatchObject({
      title: "Song A",
      artist: "DJ X",
      songLink: "https://youtu.be/1",
      source: "shop",
    });
    expect(added.customFields).toEqual([{ id: "c1", label: "BPM", value: "128" }]);
    expect(added.id).not.toBe("p1");
    expect(screen.getByRole("button", { name: "トラックを追加" })).toBeInTheDocument();
  });
});
