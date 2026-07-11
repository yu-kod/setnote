import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackCard } from "./TrackCard";
import type { Track } from "../types";

type Props = {
  track: Track;
  index: number;
  onChange: (track: Track) => void;
  onDelete: () => void;
};

export function SortableTrack({ track, index, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: track.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handle = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="並べ替え"
      className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical />
    </Button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <TrackCard
        track={track}
        index={index}
        onChange={onChange}
        onDelete={onDelete}
        dragHandle={handle}
      />
    </div>
  );
}
