export type Setlist = {
  id: string;
  userId: string;
  name: string;
  eventName: string | null;
  eventLink: string | null;
  eventDate: string | null;
  tracks: unknown[];
  status: "draft" | "published" | "unpublished";
  createdAt: string;
  updatedAt: string;
};
