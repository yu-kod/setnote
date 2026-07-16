import type { ParsedTrack } from "./api";
import type { Track } from "./types";
import { createTrack } from "./track";
import { normalizeForMatch } from "./trackMatch";

export function matchImportedTracks(parsed: ParsedTrack[], suggestions: Track[]): Track[] {
  return parsed.map((p) => {
    const normalizedTitle = normalizeForMatch(p.title);
    const match = normalizedTitle
      ? suggestions.find((s) => normalizeForMatch(s.title) === normalizedTitle)
      : undefined;

    if (match) {
      return createTrack({
        title: p.title,
        artist: p.artist,
        songLink: match.songLink,
        source: match.source,
        customFields: match.customFields,
      });
    }

    return createTrack({ title: p.title, artist: p.artist });
  });
}
