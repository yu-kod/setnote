// 編集中の内容を端末ローカルに退避する。
// 公開中のセットリストは「保存＝即公開反映」なので自動保存は行わず、
// 未保存の編集はここに置いておき、保存ボタンを押したときだけサーバーへ送る。
import type { Track } from "./types";

export type SetlistDraft = {
  name: string;
  artistName: string;
  eventName: string;
  eventLink: string;
  eventDate: string;
  tracks: Track[];
};

const storageKey = (setlistId: string) => `setnote_draft_${setlistId}`;

export function loadDraft(setlistId: string): SetlistDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(setlistId));
    return raw ? (JSON.parse(raw) as SetlistDraft) : null;
  } catch {
    // 壊れた下書きは無かったことにして、サーバーの内容で編集を始める。
    return null;
  }
}

export function saveDraft(setlistId: string, draft: SetlistDraft): void {
  try {
    localStorage.setItem(storageKey(setlistId), JSON.stringify(draft));
  } catch {
    // ストレージが使えなくても編集自体は続けられるので無視する。
  }
}

export function clearDraft(setlistId: string): void {
  try {
    localStorage.removeItem(storageKey(setlistId));
  } catch {
    // 同上。
  }
}

export function hasUnsavedChanges(draft: SetlistDraft, saved: SetlistDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(saved);
}
