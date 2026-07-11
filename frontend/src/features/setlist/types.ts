export type CustomField = {
  id: string;
  label: string;
  value: string;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  songLink: string;
  source: string;
  customFields: CustomField[];
};

export type Setlist = {
  id: string;
  userId: string;
  name: string;
  // 作成者の名義（DJ/アーティスト名）。トラックの artist とは別。
  artistName: string | null;
  eventName: string | null;
  eventLink: string | null;
  eventDate: string | null;
  tracks: Track[];
  status: "draft" | "published" | "unpublished";
  createdAt: string;
  updatedAt: string;
};
