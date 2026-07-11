import { getMediaEmbed } from "../media";

const aspectClass: Record<string, string> = {
  youtube: "aspect-video",
  niconico: "aspect-video",
  spotify: "h-[152px]",
  soundcloud: "h-[166px]",
};

// 楽曲リンクを判定し、対応サービスなら直接 iframe 埋め込み、
// 未対応ならリンク表示にフォールバックする（music-chain 方式）。
export function MediaEmbed({ url }: { url: string }) {
  const embed = getMediaEmbed(url);

  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block text-sm text-primary underline underline-offset-4"
      >
        再生・リンク
      </a>
    );
  }

  return (
    <iframe
      src={embed.src}
      title={embed.title}
      loading="lazy"
      allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; fullscreen"
      allowFullScreen
      className={`w-full rounded-md border-0 ${aspectClass[embed.type]}`}
    />
  );
}
