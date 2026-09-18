import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPublicSetlist,
  recordSetlistView,
  likeTrack,
  unlikeTrack,
} from "../features/setlist/api";
import { getLikedTrackIds, markLiked, unmarkLiked } from "../features/setlist/likes";
import { groupTracks } from "../features/setlist/trackGroup";
import type { Setlist, Track } from "../features/setlist/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Heart } from "lucide-react";
import { MediaEmbed } from "../features/setlist/components/MediaEmbed";
import { getThumbnailProxyUrl } from "../features/setlist/thumbnail";
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
  // 一覧表示：プレイヤーといいねを畳み、全曲を詰めて並べる。
  // スクロールせずにセット全体を見渡すための表示モード。
  const [listView, setListView] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Set<string>>(() => getLikedTrackIds(id!));
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublicSetlist(id!)
      .then((s) => {
        setSetlist(s);
        setLikeCounts(s.likeCounts ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // 公開ページ表示のPVを計測（fire-and-forget）。
    recordSetlistView(id!);
  }, [id]);

  // いいねのトグル（曲ごと1回まで）。未いいねなら付け、いいね済みなら取り消す。
  // 成功したら数を更新し、端末ローカルの記録も切り替える。
  const handleToggleLike = async (trackId: string) => {
    const alreadyLiked = liked.has(trackId);
    try {
      const count = alreadyLiked ? await unlikeTrack(id!, trackId) : await likeTrack(id!, trackId);
      setLikeCounts((prev) => ({ ...prev, [trackId]: count }));
      setLiked((prev) => {
        const next = new Set(prev);
        if (alreadyLiked) next.delete(trackId);
        else next.add(trackId);
        return next;
      });
      if (alreadyLiked) unmarkLiked(id!, trackId);
      else markLiked(id!, trackId);
    } catch {
      // いいねの失敗はページ操作を妨げない。
    }
  };

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
  const groups = groupTracks(tracks);
  const trackNumber = new Map<string, number>();
  groups.forEach((group, gi) => {
    for (const t of group) trackNumber.set(t.id, gi + 1);
  });
  // 未選択（初期表示）は先頭曲を開いた状態にする。
  const selected = tracks.find((t) => t.id === selectedId) ?? tracks[0];
  const selectedGroup: Track[] = selected
    ? groups.find((g) => g.some((t) => t.id === selected.id))!
    : [];

  const handleSelect = (trackId: string) => {
    setSelectedId(trackId);
    // 長いリストでも下のプレイヤーが画面内に来るよう寄せる。
    // playerRef は目次を描画している間（＝行がクリックできる間）は必ず存在する。
    playerRef.current!.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{setlist.name}</h1>
          {setlist.artistName && (
            <p className="text-sm font-medium text-foreground">by {setlist.artistName}</p>
          )}
        </div>
        {/* イベント情報は右寄せ。リンクがあればイベント名自体をリンク化し末尾にアイコンを付ける。 */}
        <div className="space-y-1 text-right">
          {setlist.eventName &&
            (setlist.eventLink ? (
              <a
                href={setlist.eventLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4"
              >
                {setlist.eventName}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : (
              <p className="font-medium">{setlist.eventName}</p>
            ))}
          {setlist.eventDate && (
            <p className="text-sm text-muted-foreground">{formatEventDate(setlist.eventDate)}</p>
          )}
        </div>
      </div>

      {selected ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setListView((v) => !v)}
            >
              {listView ? "通常表示" : "一覧表示"}
            </Button>
          </div>

          {/* 目次：全曲を一覧表示。行をタップすると下のプレイヤーが切り替わる。 */}
          <ol className="overflow-hidden rounded-md border">
            {tracks.map((track, i) => {
              // 一覧表示では選択の概念がないため、ハイライトも出さない。
              const active = !listView && track.id === selected.id;
              const alreadyLiked = liked.has(track.id);
              // サムネイルは YouTube Data API 経由のプロキシから取得し、
              // 動画ページへのリンクを添える（YouTube の利用条件に沿わせるため）。
              const thumbnailUrl = getThumbnailProxyUrl(track.songLink);
              const prevTrack = tracks[i - 1];
              const isGroupedWithPrev =
                prevTrack && track.groupId != null && prevTrack.groupId === track.groupId;
              // 行の中身は通常表示と一覧表示で共通。包む要素だけが変わる。
              const rowContent = (
                <>
                  <span className="text-muted-foreground">{trackNumber.get(track.id)}.</span>
                  <span className="font-medium">{track.title}</span>
                  {track.artist && <span className="text-muted-foreground">— {track.artist}</span>}
                  {isGroupedWithPrev && (
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
                      BLEND
                    </span>
                  )}
                </>
              );
              return (
                <li
                  key={track.id}
                  className={`flex items-stretch ${i > 0 && !isGroupedWithPrev ? "border-t" : ""}`}
                >
                  {track.groupId != null && (
                    <div className="w-1 shrink-0 bg-primary" aria-hidden="true" />
                  )}
                  {thumbnailUrl && (
                    <a
                      href={track.songLink}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex shrink-0 items-center transition-colors ${
                        active ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <img
                        src={thumbnailUrl}
                        alt={`${track.title} のサムネイル`}
                        loading="lazy"
                        className={`object-cover ${listView ? "h-7 w-12" : "h-9 w-16"}`}
                      />
                    </a>
                  )}
                  {listView ? (
                    <div className="flex flex-1 items-baseline gap-2 px-3 py-1 text-sm">
                      {rowContent}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelect(track.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex flex-1 items-baseline gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                        active ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      {rowContent}
                    </button>
                  )}
                  {!listView && (
                    <button
                      type="button"
                      onClick={() => handleToggleLike(track.id)}
                      aria-label={`${track.title}にいいね`}
                      aria-pressed={alreadyLiked}
                      className={`flex shrink-0 items-center gap-1 px-3 text-xs transition-colors ${
                        alreadyLiked ? "text-primary" : "text-muted-foreground"
                      } ${active ? "bg-muted" : "hover:bg-muted/50"}`}
                    >
                      <Heart
                        aria-hidden="true"
                        className={`size-4 ${alreadyLiked ? "fill-primary text-primary" : ""}`}
                      />
                      <span className="tabular-nums">{likeCounts[track.id] ?? 0}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {/* 選択中のグループをプレイヤーとして開く。一覧表示では畳む。 */}
          {!listView && (
            <div ref={playerRef} role="region" aria-label="選択中の曲">
              <Card>
                <CardContent className="space-y-3">
                  {selectedGroup.map((t) => (
                    <div key={t.id} className="space-y-3">
                      {t.songLink ? (
                        <MediaEmbed url={t.songLink} />
                      ) : (
                        <p className="text-sm text-muted-foreground">再生リンクはありません</p>
                      )}
                      <div>
                        <p className="font-semibold">{t.title}</p>
                        {t.artist && <p className="text-sm text-muted-foreground">{t.artist}</p>}
                      </div>
                      {t.source &&
                        (isUrl(t.source) ? (
                          <a
                            href={t.source}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm text-primary underline underline-offset-4"
                          >
                            入手元
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">入手元: {t.source}</p>
                        ))}
                      {t.customFields.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {t.customFields.map((f) => (
                            <span key={f.id}>
                              {f.label}: {f.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">曲がまだありません</p>
      )}
    </div>
  );
}
