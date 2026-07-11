import type { Track, CustomField } from "./types";

const newId = () => crypto.randomUUID();

export function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: newId(),
    title: "",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    ...overrides,
  };
}

export function createCustomField(): CustomField {
  return { id: newId(), label: "", value: "" };
}

// activeId のトラックを overId の位置へ移動した新しい配列を返す（並べ替え用）。
export function moveTrack(tracks: Track[], activeId: string, overId: string): Track[] {
  const from = tracks.findIndex((t) => t.id === activeId);
  const to = tracks.findIndex((t) => t.id === overId);
  if (from === -1 || to === -1) return tracks;
  const next = tracks.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
