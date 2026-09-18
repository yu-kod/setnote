import { getMediaEmbed } from "./media";

// サムネイルを出せるのは、公式にサムネイルの取得経路が用意されている
// サービスだけ（YouTube は Data API、Spotify と SoundCloud は oEmbed）。
// ニコニコ動画は埋め込みには対応しているが、そうした経路がないため対象外。
const THUMBNAIL_SUPPORTED = ["youtube", "spotify", "soundcloud"];

export function getThumbnailProxyUrl(songLink: string): string | null {
  const embed = getMediaEmbed(songLink);
  if (!embed || !THUMBNAIL_SUPPORTED.includes(embed.type)) return null;
  return `/api/proxy/thumbnail?url=${encodeURIComponent(songLink)}`;
}
