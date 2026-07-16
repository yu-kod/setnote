import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { renderWithProviders, screen, within, userEvent } from "../../../test-utils";
import { TrackCard } from "./TrackCard";
import type { Track } from "../types";

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "t1",
    title: "Song",
    artist: "Artist",
    songLink: "",
    source: "",
    customFields: [],
    ...overrides,
  };
}

function Harness({
  initial,
  onDelete = () => {},
  suggestions = [],
}: {
  initial: Track;
  onDelete?: () => void;
  suggestions?: Track[];
}) {
  const [track, setTrack] = useState(initial);
  return (
    <>
      <TrackCard
        track={track}
        index={0}
        onChange={setTrack}
        onDelete={onDelete}
        suggestions={suggestions}
      />
      <output data-testid="snapshot">{JSON.stringify(track)}</output>
    </>
  );
}

function snapshot(): Track {
  return JSON.parse(screen.getByTestId("snapshot").textContent as string);
}

describe("TrackCard", () => {
  it("displays the track fields", () => {
    renderWithProviders(<Harness initial={buildTrack({ title: "My Song", artist: "DJ X" })} />);

    expect(screen.getByLabelText("曲名")).toHaveValue("My Song");
    expect(screen.getByLabelText("アーティスト")).toHaveValue("DJ X");
  });

  it("edits the basic fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness initial={buildTrack({ title: "", artist: "", songLink: "", source: "" })} />
    );

    await user.type(screen.getByLabelText("曲名"), "T");
    await user.type(screen.getByLabelText("アーティスト"), "A");
    await user.type(screen.getByLabelText("楽曲リンク"), "L");
    await user.type(screen.getByLabelText("入手元"), "S");

    expect(snapshot()).toMatchObject({ title: "T", artist: "A", songLink: "L", source: "S" });
  });

  it("adds a custom field", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial={buildTrack()} />);

    await user.click(screen.getByRole("button", { name: "項目を追加" }));

    expect(screen.getByLabelText("項目名")).toBeInTheDocument();
    expect(snapshot().customFields).toHaveLength(1);
  });

  it("edits one custom field without affecting the others", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness
        initial={buildTrack({
          customFields: [
            { id: "c1", label: "", value: "" },
            { id: "c2", label: "Key", value: "" },
          ],
        })}
      />
    );

    await user.type(screen.getAllByLabelText("項目名")[0], "BPM");
    await user.type(screen.getAllByLabelText("値")[0], "128");

    const fields = snapshot().customFields;
    expect(fields[0]).toMatchObject({ id: "c1", label: "BPM", value: "128" });
    expect(fields[1]).toMatchObject({ id: "c2", label: "Key", value: "" });
  });

  it("removes a custom field", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness
        initial={buildTrack({
          customFields: [
            { id: "c1", label: "BPM", value: "128" },
            { id: "c2", label: "Key", value: "Am" },
          ],
        })}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "項目を削除" })[0]);

    const fields = snapshot().customFields;
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("c2");
  });

  it("shows no suggestions when title input is not focused", () => {
    const suggestions = [buildTrack({ id: "s1", title: "Song" })];
    renderWithProviders(
      <Harness initial={buildTrack({ title: "Song" })} suggestions={suggestions} />
    );

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("shows no suggestions when title is empty even if focused", async () => {
    const user = userEvent.setup();
    const suggestions = [buildTrack({ id: "s1", title: "Song" })];
    renderWithProviders(
      <Harness initial={buildTrack({ title: "" })} suggestions={suggestions} />
    );

    await user.click(screen.getByLabelText("曲名"));

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("shows matching suggestions when title input is focused and has text", async () => {
    const user = userEvent.setup();
    const suggestions = [
      buildTrack({ id: "s1", title: "Song A", artist: "DJ X" }),
      buildTrack({ id: "s2", title: "Other", artist: "" }),
    ];
    renderWithProviders(
      <Harness initial={buildTrack({ title: "" })} suggestions={suggestions} />
    );

    await user.click(screen.getByLabelText("曲名"));
    await user.type(screen.getByLabelText("曲名"), "Song");

    expect(screen.getByRole("option", { name: /Song A/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Other/ })).not.toBeInTheDocument();
  });

  it("hides suggestions when title input loses focus", async () => {
    const user = userEvent.setup();
    const suggestions = [buildTrack({ id: "s1", title: "Song A" })];
    renderWithProviders(
      <Harness initial={buildTrack({ title: "" })} suggestions={suggestions} />
    );

    await user.click(screen.getByLabelText("曲名"));
    await user.type(screen.getByLabelText("曲名"), "Song");
    expect(screen.getByRole("option")).toBeInTheDocument();

    await user.click(screen.getByLabelText("アーティスト"));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("selects a suggestion and merges fields while preserving track id", async () => {
    const user = userEvent.setup();
    const suggestions = [
      buildTrack({
        id: "s1",
        title: "Song A",
        artist: "DJ X",
        songLink: "https://link",
        source: "Beatport",
        customFields: [{ id: "c1", label: "BPM", value: "128" }],
      }),
    ];
    renderWithProviders(
      <Harness initial={buildTrack({ id: "original-id", title: "" })} suggestions={suggestions} />
    );

    await user.click(screen.getByLabelText("曲名"));
    await user.type(screen.getByLabelText("曲名"), "Song");
    await user.click(screen.getByRole("option", { name: /Song A/ }));

    const result = snapshot();
    expect(result.id).toBe("original-id");
    expect(result.title).toBe("Song A");
    expect(result.artist).toBe("DJ X");
    expect(result.songLink).toBe("https://link");
    expect(result.source).toBe("Beatport");
    expect(result.customFields).toEqual([{ id: "c1", label: "BPM", value: "128" }]);
  });

  it("hides suggestions after selecting one", async () => {
    const user = userEvent.setup();
    const suggestions = [buildTrack({ id: "s1", title: "Song A" })];
    renderWithProviders(
      <Harness initial={buildTrack({ title: "" })} suggestions={suggestions} />
    );

    await user.click(screen.getByLabelText("曲名"));
    await user.type(screen.getByLabelText("曲名"), "Song");
    await user.click(screen.getByRole("option", { name: /Song A/ }));

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("shows artist alongside title in suggestion items", async () => {
    const user = userEvent.setup();
    const suggestions = [
      buildTrack({ id: "s1", title: "Song A", artist: "DJ X" }),
    ];
    renderWithProviders(
      <Harness initial={buildTrack({ title: "" })} suggestions={suggestions} />
    );

    await user.click(screen.getByLabelText("曲名"));
    await user.type(screen.getByLabelText("曲名"), "Song");

    const option = screen.getByRole("option");
    expect(option).toHaveTextContent("Song A");
    expect(option).toHaveTextContent("DJ X");
  });

  it("deletes the track after confirming", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Harness initial={buildTrack()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "削除" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
