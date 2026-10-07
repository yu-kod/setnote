import { getMediaEmbed } from "./media";

// 埋め込みに対応しているサービスはすべて、公式の経路でサムネイルを取得できる
// （YouTube は Data API、Spotify と SoundCloud は oEmbed、ニコニコ動画は getthumbinfo）。
export function getThumbnailProxyUrl(songLink: string): string | null {
  if (!getMediaEmbed(songLink)) return null;
  return `/api/proxy/thumbnail?url=${encodeURIComponent(songLink)}`;
}
