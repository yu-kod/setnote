import type { Track } from "./types";

export function groupTracks(tracks: Track[]): Track[][] {
  const groups: Track[][] = [];
  for (const track of tracks) {
    const prev = groups[groups.length - 1];
    if (prev && track.groupId && prev[prev.length - 1].groupId === track.groupId) {
      prev.push(track);
    } else {
      groups.push([track]);
    }
  }
  return groups;
}

export function toggleGroup(tracks: Track[], gapIndex: number): Track[] {
  if (gapIndex < 0 || gapIndex >= tracks.length - 1) return tracks;

  const a = tracks[gapIndex];
  const b = tracks[gapIndex + 1];

  if (a.groupId && a.groupId === b.groupId) {
    return tracks.map((t) => (t.groupId === a.groupId ? { ...t, groupId: null } : t));
  }

  const groupId = a.groupId ?? b.groupId ?? crypto.randomUUID();
  return tracks.map((t) => {
    if (t === a || t === b) return { ...t, groupId };
    if (t.groupId && (t.groupId === a.groupId || t.groupId === b.groupId)) return { ...t, groupId };
    return t;
  });
}
