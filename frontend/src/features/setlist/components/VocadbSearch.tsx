import { useState } from "react";
import { toast } from "sonner";
import { Music, Search } from "lucide-react";
import {
  searchVocadbSongs,
  type VocadbArtist,
  type VocadbSearchResult,
  type VocadbSong,
} from "../api";
import { createTrack } from "../track";
import { getThumbnailProxyUrl } from "../thumbnail";
import type { Track } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; result: VocadbSearchResult; searchedArtist: boolean };

export function VocadbSearch({ onAdd }: { onAdd: (track: Track) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  // 同じ曲を続けて押してしまう事故を防ぐため、追加済みの VocaDB ID を覚えておく。
  const [addedIds, setAddedIds] = useState<number[]>([]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTitle("");
      setArtist("");
      setState({ status: "idle" });
      setAddedIds([]);
    }
  }

  async function runSearch(artistId?: number) {
    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();
    if (!trimmedTitle && !trimmedArtist) return;

    setState({ status: "searching" });
    try {
      const result = await searchVocadbSongs({
        title: trimmedTitle,
        artist: trimmedArtist,
        ...(artistId === undefined ? {} : { artistId }),
      });
      setState({ status: "done", result, searchedArtist: trimmedArtist !== "" });
    } catch {
      setState({ status: "idle" });
      toast.error("VocaDBの検索に失敗しました");
    }
  }

  function handleAdd(song: VocadbSong) {
    onAdd(createTrack({ title: song.title, artist: song.artist, songLink: song.songLink }));
    setAddedIds((prev) => [...prev, song.id]);
  }

  const searching = state.status === "searching";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <Search className="mr-2 h-4 w-4" aria-hidden="true" />
          VocaDBから検索
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>VocaDBから曲を追加</DialogTitle>
          <DialogDescription>
            曲名・作者名・楽曲リンクをまとめて取り込みます。楽曲リンクは YouTube を優先し、
            無ければニコニコ動画を使います。
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="vocadb-title">曲名</Label>
              <Input
                id="vocadb-title"
                type="search"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="曲名の一部でも可"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vocadb-artist">作者名</Label>
              <Input
                id="vocadb-artist"
                type="search"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="ボカロP・サークル名"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            どちらか一方でも、両方指定して絞り込むこともできます。
          </p>
          <Button type="submit" disabled={searching} className="w-full">
            {searching ? "検索中..." : "検索"}
          </Button>
        </form>

        {state.status === "done" && (
          <SearchResults
            result={state.result}
            searchedArtist={state.searchedArtist}
            addedIds={addedIds}
            onAdd={handleAdd}
            onPickArtist={(candidate) => void runSearch(candidate.id)}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SearchResultsProps = {
  result: VocadbSearchResult;
  searchedArtist: boolean;
  addedIds: number[];
  onAdd: (song: VocadbSong) => void;
  onPickArtist: (artist: VocadbArtist) => void;
};

function SearchResults({
  result,
  searchedArtist,
  addedIds,
  onAdd,
  onPickArtist,
}: SearchResultsProps) {
  // 作者名を入れたのに誰にも当たらなかったときは、0件とは別の説明を出す。
  // 別人の曲が黙って並ぶより「誰も見つからなかった」と分かるほうがよい。
  if (searchedArtist && !result.artist) {
    return <p className="text-sm text-muted-foreground">その作者は見つかりませんでした</p>;
  }

  return (
    <div className="space-y-2">
      {result.artist && (
        <ArtistPicker
          artist={result.artist}
          candidates={result.artistCandidates}
          onPick={onPickArtist}
        />
      )}

      {result.songs.length === 0 ? (
        <p className="text-sm text-muted-foreground">見つかりませんでした</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {result.songs.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              added={addedIds.includes(song.id)}
              onAdd={() => onAdd(song)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArtistPicker({
  artist,
  candidates,
  onPick,
}: {
  artist: VocadbArtist;
  candidates: VocadbArtist[];
  onPick: (artist: VocadbArtist) => void;
}) {
  // VocaDB の作者検索は部分一致なので、狙いと違う人が当たることがある。
  // 誰を採用したかを見せて、違えば選び直せるようにする。
  const others = candidates.filter((c) => c.id !== artist.id);

  return (
    <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
      <span className="text-muted-foreground">作者: </span>
      <span className="font-medium">{artist.name}</span>
      {artist.artistType && (
        <span className="ml-1 text-xs text-muted-foreground">({artist.artistType})</span>
      )}
      {others.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">別の作者で探す:</span>
          {others.map((candidate) => (
            <Button
              key={candidate.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onPick(candidate)}
            >
              {candidate.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function SongRow({ song, added, onAdd }: { song: VocadbSong; added: boolean; onAdd: () => void }) {
  // サムネイルは YouTube Data API 経由のプロキシから取得し、
  // 動画ページへのリンクを添える（YouTube の利用条件に沿わせるため）。
  // ニコニコ動画しか PV が無い曲は対象外なのでプレースホルダを置く。
  const thumbnailUrl = getThumbnailProxyUrl(song.songLink);

  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
      {thumbnailUrl ? (
        <a href={song.songLink} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={thumbnailUrl}
            alt={`${song.title} のサムネイル`}
            loading="lazy"
            className="h-9 w-16 rounded-sm object-cover"
          />
        </a>
      ) : (
        <div
          aria-hidden="true"
          className="flex h-9 w-16 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground"
        >
          <Music className="size-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{song.title}</span>
          {/* Original が大多数なので、見分けが要る Remix / Cover 等だけ出す。 */}
          {song.songType && song.songType !== "Original" && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {song.songType}
            </Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {song.artist}
          {!song.songLink && (
            <span className="ml-2 text-amber-600 dark:text-amber-500">楽曲リンクなし</span>
          )}
        </p>
      </div>

      <Button
        type="button"
        variant={added ? "ghost" : "outline"}
        size="sm"
        disabled={added}
        onClick={onAdd}
      >
        {added ? "追加済み" : "追加"}
      </Button>
    </li>
  );
}
