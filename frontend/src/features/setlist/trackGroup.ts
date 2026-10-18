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

function findRunBounds(tracks: Track[], gapIndex: number, groupId: string): [number, number] {
  let start = gapIndex;
  while (start > 0 && tracks[start - 1].groupId === groupId) start--;
  let end = gapIndex + 1;
  while (end < tracks.length - 1 && tracks[end + 1].groupId === groupId) end++;
  return [start, end];
}

export function toggleGroup(tracks: Track[], gapIndex: number): Track[] {
  if (gapIndex < 0 || gapIndex >= tracks.length - 1) return tracks;

  const a = tracks[gapIndex];
  const b = tracks[gapIndex + 1];

  if (a.groupId && a.groupId === b.groupId) {
    const [start, end] = findRunBounds(tracks, gapIndex, a.groupId);
    const leftAlone = gapIndex === start;
    const rightAlone = gapIndex + 1 === end;
    const newId = rightAlone ? null : crypto.randomUUID();
    return tracks.map((t, i) => {
      if (i >= start && i <= gapIndex) return leftAlone && i === start ? { ...t, groupId: null } : t;
      if (i >= gapIndex + 1 && i <= end) return { ...t, groupId: newId };
      return t;
    });
  }

  const groupId = a.groupId ?? b.groupId ?? crypto.randomUUID();
  return tracks.map((t, i) => {
    if (i === gapIndex || i === gapIndex + 1) return { ...t, groupId };
    if (t.groupId && (t.groupId === a.groupId || t.groupId === b.groupId)) return { ...t, groupId };
    return t;
  });
}
