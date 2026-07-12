export type LikesInput = {
  tracks?: { id: string; title?: string; artist?: string }[];
  likeCounts?: Record<string, number>;
};

export type TrackLike = {
  title: string;
  artist: string;
  likes: number;
};

export function aggregateLikes(setlists: LikesInput[]): TrackLike[] {
  const byTitle = new Map<string, TrackLike>();

  for (const setlist of setlists) {
    const tracks = setlist.tracks ?? [];
    const likeCounts = setlist.likeCounts ?? {};

    const trackById = new Map(tracks.map((t) => [t.id, t]));

    for (const [trackId, count] of Object.entries(likeCounts)) {
      if (count <= 0) continue;
      const track = trackById.get(trackId);
      if (!track) continue;

      const title = (track.title ?? "").trim();
      if (!title) continue;

      const existing = byTitle.get(title);
      if (existing) {
        existing.likes += count;
      } else {
        byTitle.set(title, { title, artist: track.artist ?? "", likes: count });
      }
    }
  }

  return [...byTitle.values()].sort((a, b) => b.likes - a.likes || a.title.localeCompare(b.title));
}
