// セットリストを X などに貼れるプレーンテキストに整形する。
import { groupTracks } from "./trackGroup";
import type { Track } from "./types";

export type TracklistTextInput = {
  name: string;
  eventName: string | null;
  eventDate: string | null;
  // 公開中のときだけ末尾に添える公開URL。未公開なら null。
  publicUrl: string | null;
  tracks: Track[];
};

// 開催日（YYYY-MM-DD）をタイムゾーンに依存せず表示用に整形する。
function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}/${Number(month)}/${Number(day)}`;
}

function formatTrack(track: Track): string {
  return track.artist ? `${track.title} — ${track.artist}` : track.title;
}

export function buildTracklistText(input: TracklistTextInput): string {
  const header = [input.name];
  const eventLine = [input.eventName, input.eventDate ? formatEventDate(input.eventDate) : null]
    .filter(Boolean)
    .join(" / ");
  if (eventLine) header.push(eventLine);

  // 結合した曲は1つの番号にまとめ、2曲目以降を " + " で続ける（公開ページの BLEND 表示に合わせる）。
  const lines = groupTracks(input.tracks).flatMap((group, i) =>
    group.map((track, j) =>
      j === 0 ? `${i + 1}. ${formatTrack(track)}` : ` + ${formatTrack(track)}`
    )
  );

  const blocks = [header.join("\n")];
  if (lines.length > 0) blocks.push(lines.join("\n"));
  if (input.publicUrl) blocks.push(input.publicUrl);

  return blocks.join("\n\n");
}
