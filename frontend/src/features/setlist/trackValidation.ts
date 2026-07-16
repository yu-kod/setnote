import type { Track } from "./types";

export function findEmptyTitleTracks(tracks: Track[]): number[] {
  return tracks.reduce<number[]>(
    (acc, t, i) => (t.title.trim() ? acc : [...acc, i]),
    []
  );
}

export function hasEmptyTitleTracks(tracks: Track[]): boolean {
  return tracks.some((t) => !t.title.trim());
}
