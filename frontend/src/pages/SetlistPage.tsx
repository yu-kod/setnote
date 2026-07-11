import { useState, useEffect } from "react";
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

      <ol className="space-y-3">
        {setlist.tracks.map((track, i) => (
          <li key={track.id}>
            <Card>
              <CardContent className="flex gap-4 pt-6">
                {track.songLink && (
                  <div className="w-40 shrink-0">
                    <MediaEmbed url={track.songLink} />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="font-semibold">{track.title}</span>
                  </div>
                  {track.artist && <p className="text-sm text-muted-foreground">{track.artist}</p>}
                  {track.source &&
                    (isUrl(track.source) ? (
                      <a
                        href={track.source}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm text-primary underline underline-offset-4"
                      >
                        入手元
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">入手元: {track.source}</p>
                    ))}
                  {track.customFields.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {track.customFields.map((f) => (
                        <span key={f.id}>
                          {f.label}: {f.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
