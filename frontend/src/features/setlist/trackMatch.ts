import { toHiragana } from "wanakana";
import type { Track } from "./types";

function rawForm(text: string): string {
  return text.trim().normalize("NFKC").toLowerCase();
}

function kanaForm(text: string): string {
  return toHiragana(rawForm(text), { passRomaji: false });
}

function stripParens(text: string): string {
  return text.replace(/\([^)]*\)/g, "").replace(/（[^）]*）/g, "");
}

function stripSpaces(text: string): string {
  return text.replace(/\s+/g, "");
}

export function normalizeForMatch(text: string): string {
  return stripSpaces(stripParens(rawForm(text)));
}

function normalizeKanaForMatch(text: string): string {
  return stripSpaces(stripParens(kanaForm(text)));
}

export function matchTracks(tracks: Track[], rawQuery: string, limit = 8): Track[] {
  const raw = normalizeForMatch(rawQuery);
  if (!raw) return [];

  const kana = normalizeKanaForMatch(rawQuery);
  const matched: Track[] = [];
  for (const t of tracks) {
    if (normalizeForMatch(t.title).includes(raw) || normalizeKanaForMatch(t.title).includes(kana)) {
      matched.push(t);
      if (matched.length >= limit) break;
    }
  }
  return matched;
}
