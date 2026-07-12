import { toHiragana } from "wanakana";
import type { Track } from "./types";

// 素の照合形。全角→半角・大文字小文字の違いを NFKC + lowercase で吸収する。
function rawForm(text: string): string {
  return text.trim().normalize("NFKC").toLowerCase();
}

// かな照合形。カタカナ・ローマ字の違いを吸収するため全体をひらがなへ寄せる。
// 漢字はそのまま残る（読みは持たないため一致対象外）。
function kanaForm(text: string): string {
  return toHiragana(rawForm(text), { passRomaji: false });
}

// 過去入力トラックを、入力途中のクエリに部分一致するものだけ抽出する。
// 素の形とかな正規化した形の両方で判定し（英語タイトルの取りこぼし防止）、
// いずれかがヒットすれば候補とする。
export function matchTracks(tracks: Track[], rawQuery: string, limit = 8): Track[] {
  const raw = rawForm(rawQuery);
  if (!raw) return [];

  const kana = kanaForm(rawQuery);
  const matched: Track[] = [];
  for (const t of tracks) {
    if (rawForm(t.title).includes(raw) || kanaForm(t.title).includes(kana)) {
      matched.push(t);
      if (matched.length >= limit) break;
    }
  }
  return matched;
}
