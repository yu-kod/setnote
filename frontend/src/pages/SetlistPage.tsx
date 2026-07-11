import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicSetlist } from "../features/setlist/api";
import type { Setlist } from "../features/setlist/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaEmbed } from "../features/setlist/components/MediaEmbed";
import NotFoundPage from "./NotFoundPage";

const isUrl = (s: string) => /^https?:\/\//.test(s);

function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}/${Number(month)}/${Number(day)}`;
}

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublicSetlist(id!)
      .then(setSetlist)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // 未公開・削除・存在しないIDはすべて共通の404（情報漏洩防止）。
  if (!setlist) {
    return <NotFoundPage />;
  }

  const tracks = setlist.tracks;
  // 未選択（初期表示）は先頭曲を開いた状態にする。
  const selected = tracks.find((t) => t.id === selectedId) ?? tracks[0];

  const handleSelect = (trackId: string) => {
    setSelectedId(trackId);
    // 長いリストでも下のプレイヤーが画面内に来るよう寄せる。
    // playerRef は目次を描画している間（＝行がクリックできる間）は必ず存在する。
    playerRef.current!.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{setlist.name}</h1>
        {setlist.artistName && (
          <p className="text-sm font-medium text-foreground">by {setlist.artistName}</p>
        )}
        {setlist.eventName && <p className="text-muted-foreground">{setlist.eventName}</p>}
        {setlist.eventDate && (
          <p className="text-sm text-muted-foreground">{formatEventDate(setlist.eventDate)}</p>
        )}
        {setlist.eventLink && (
          <a
            href={setlist.eventLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline underline-offset-4"
          >
            イベントページ
          </a>
        )}
      </div>

      {selected ? (
        <div className="space-y-4">
          {/* 目次：全曲を一覧表示。行をタップすると下のプレイヤーが切り替わる。 */}
          <ol className="divide-y overflow-hidden rounded-md border">
            {tracks.map((track, i) => {
              const active = track.id === selected.id;
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(track.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-baseline gap-2 px-4 py-3 text-left transition-colors ${
                      active ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{track.title}</span>
                    {track.artist && (
                      <span className="text-sm text-muted-foreground">— {track.artist}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* 選択中の1曲だけをプレイヤーとして開く。 */}
          <div ref={playerRef}>
            <Card>
              <CardContent className="space-y-3 pt-6">
                {selected.songLink ? (
                  <MediaEmbed url={selected.songLink} />
                ) : (
                  <p className="text-sm text-muted-foreground">再生リンクはありません</p>
                )}
                {selected.source &&
                  (isUrl(selected.source) ? (
                    <a
                      href={selected.source}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-primary underline underline-offset-4"
                    >
                      入手元
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">入手元: {selected.source}</p>
                  ))}
                {selected.customFields.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {selected.customFields.map((f) => (
                      <span key={f.id}>
                        {f.label}: {f.value}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">曲がまだありません</p>
      )}
    </div>
  );
}
