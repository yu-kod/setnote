import type { Setlist } from "./types";
import { clearSession, redirectToLogin } from "../auth/session";

function getToken(): string {
  return localStorage.getItem("setnote_access_token") ?? "";
}

async function setlistRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`/api/setlists${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    if (res.status === 401) {
      // トークン失効。セッションを破棄してログイン画面へ誘導する。
      clearSession();
      redirectToLogin();
    }
    const data = await res.json().catch(() => ({}));
    const message =
      (data as Record<string, unknown>).error instanceof Object
        ? ((data as Record<string, Record<string, string>>).error.message ?? "エラーが発生しました")
        : typeof (data as Record<string, unknown>).error === "string"
          ? (data as Record<string, string>).error
          : "エラーが発生しました";
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type UpdateSetlistInput = {
  name: string;
  eventName: string | null;
  eventLink: string | null;
  eventDate: string | null;
  tracks: unknown[];
};

export function fetchMySetlists(): Promise<Setlist[]> {
  return setlistRequest<Setlist[]>("/mine");
}

export function createSetlist(name: string): Promise<Setlist> {
  return setlistRequest<Setlist>("", { method: "POST", body: { name } });
}

// 編集用の取得は所有者専用の GET が無いため、認証付きの一覧から id で絞る。
export async function fetchSetlist(id: string): Promise<Setlist | null> {
  const setlists = await fetchMySetlists();
  return setlists.find((s) => s.id === id) ?? null;
}

export function updateSetlist(id: string, input: UpdateSetlistInput): Promise<Setlist> {
  return setlistRequest<Setlist>(`/${id}`, { method: "PUT", body: input });
}
