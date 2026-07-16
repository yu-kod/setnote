import { createTrack } from "../track";
import type { Track } from "../types";
import { Button } from "@/components/ui/button";

export function AddTrackForm({ onAdd }: { onAdd: (track: Track) => void }) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={() => onAdd(createTrack())}>
      トラックを追加
    </Button>
  );
}
