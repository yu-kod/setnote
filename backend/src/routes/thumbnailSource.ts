// 楽曲リンクから、サムネイル画像をどの経路で取得するかを決める。
//
// 各サービスが「ドキュメント化された手段」を用意しており、そこから外れた取得
// （画像URLの推測やスクレイピング）は各社の規約で禁じられている。そのため
// YouTube は Data API、Spotify と SoundCloud は公式の oEmbed を経由する。
// ニコニコ動画は公式の oEmbed がなく、確実に使える公開経路が見当たらないため
// 対応していない。

const YOUTUBE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;
const SPOTIFY_TRACK =
  /(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/|spotify:track:)([a-zA-Z0-9]{22})/;
const SOUNDCLOUD = /soundcloud\.com\/([\w-]+\/[\w-]+)/;

export type ThumbnailSource =
  { kind: "youtube"; videoId: string } | { kind: "oembed"; endpoint: string };

export function resolveThumbnailSource(songLink: string): ThumbnailSource | null {
  const youtube = songLink.match(YOUTUBE);
  if (youtube) return { kind: "youtube", videoId: youtube[1] };

  const spotify = songLink.match(SPOTIFY_TRACK);
  if (spotify) {
    const trackUrl = `https://open.spotify.com/track/${spotify[1]}`;
    return {
      kind: "oembed",
      endpoint: `https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`,
    };
  }

  const soundcloud = songLink.match(SOUNDCLOUD);
  if (soundcloud) {
    const trackUrl = `https://soundcloud.com/${soundcloud[1]}`;
    return {
      kind: "oembed",
      endpoint: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(trackUrl)}`,
    };
  }

  return null;
}
