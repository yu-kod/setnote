import type { Setlist } from "./types";

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

export function fetchMySetlists(): Promise<Setlist[]> {
  return setlistRequest<Setlist[]>("/mine");
}

export function createSetlist(name: string): Promise<Setlist> {
  return setlistRequest<Setlist>("", { method: "POST", body: { name } });
}
