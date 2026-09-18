import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { searchVocadbSongs, type VocadbSearchBy, type VocadbSong } from "../api";
import { createTrack } from "../track";
import type { Track } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { status: "idle" } | { status: "searching" } | { status: "done"; songs: VocadbSong[] };

const SEARCH_MODES: { value: VocadbSearchBy; label: string }[] = [
  { value: "title", label: "曲名" },
  { value: "artist", label: "作者名" },
];

export function VocadbSearch({ onAdd }: { onAdd: (track: Track) => void }) {
  const [open, setOpen] = useState(false);
  const [by, setBy] = useState<VocadbSearchBy>("title");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  // 同じ曲を続けて押してしまう事故を防ぐため、追加済みの VocaDB ID を覚えておく。
  const [addedIds, setAddedIds] = useState<number[]>([]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setState({ status: "idle" });
      setAddedIds([]);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;

    setState({ status: "searching" });
    try {
      const songs = await searchVocadbSongs(term, by);
      setState({ status: "done", songs });
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

        <form onSubmit={handleSearch} className="space-y-3">
          <fieldset className="flex items-center gap-4">
            <legend className="sr-only">検索対象</legend>
            {SEARCH_MODES.map((mode) => (
              <label key={mode.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="vocadb-search-by"
                  value={mode.value}
                  checked={by === mode.value}
                  onChange={() => setBy(mode.value)}
                />
                {mode.label}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <Input
              type="search"
              aria-label="検索語"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={by === "title" ? "曲名で検索" : "作者名で検索"}
            />
            <Button type="submit" disabled={searching}>
              {searching ? "検索中..." : "検索"}
            </Button>
          </div>
        </form>

        {state.status === "done" &&
          (state.songs.length === 0 ? (
            <p className="text-sm text-muted-foreground">見つかりませんでした</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {state.songs.map((song) => {
                const added = addedIds.includes(song.id);
                return (
                  <li
                    key={song.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {song.artist}
                        {!song.songLink && (
                          <span className="ml-2 text-amber-600 dark:text-amber-500">
                            楽曲リンクなし
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={added ? "ghost" : "outline"}
                      size="sm"
                      disabled={added}
                      onClick={() => handleAdd(song)}
                    >
                      {added ? "追加済み" : "追加"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ))}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
