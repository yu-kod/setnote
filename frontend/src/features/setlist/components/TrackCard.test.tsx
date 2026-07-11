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

function Harness({ initial, onDelete = () => {} }: { initial: Track; onDelete?: () => void }) {
  const [track, setTrack] = useState(initial);
  return (
    <>
      <TrackCard track={track} index={0} onChange={setTrack} onDelete={onDelete} />
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
