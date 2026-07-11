// 楽曲リンクを判定し、各サービスの埋め込み iframe URL を生成する。
// パターンは music-chain (github.com/yu-kod/music-chain) を参照。

const YOUTUBE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;
const SPOTIFY =
  /(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/|spotify:track:)([a-zA-Z0-9]{22})/;
const SOUNDCLOUD = /soundcloud\.com\/([\w-]+\/[\w-]+)/;
const NICONICO = /(?:nicovideo\.jp\/watch\/|nico\.ms\/)((?:sm|nm|so)\d+)/;

export type MediaEmbedInfo = {
  type: "youtube" | "spotify" | "soundcloud" | "niconico";
  src: string;
  title: string;
};

export function getMediaEmbed(url: string): MediaEmbedInfo | null {
  const yt = url.match(YOUTUBE);
  if (yt) {
    return { type: "youtube", src: `https://www.youtube.com/embed/${yt[1]}`, title: "YouTube" };
  }

  const sp = url.match(SPOTIFY);
  if (sp) {
    return {
      type: "spotify",
      src: `https://open.spotify.com/embed/track/${sp[1]}?utm_source=generator&theme=0`,
      title: "Spotify",
    };
  }

  const sc = url.match(SOUNDCLOUD);
  if (sc) {
    const track = encodeURIComponent(`https://soundcloud.com/${sc[1]}`);
    return {
      type: "soundcloud",
      src: `https://w.soundcloud.com/player/?url=${track}&auto_play=false&hide_related=true&show_comments=false`,
      title: "SoundCloud",
    };
  }

  const nc = url.match(NICONICO);
  if (nc) {
    return {
      type: "niconico",
      src: `https://embed.nicovideo.jp/watch/${nc[1]}`,
      title: "niconico",
    };
  }

  return null;
}
