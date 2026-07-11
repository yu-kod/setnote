import type { Track, CustomField } from "./types";

const newId = () => crypto.randomUUID();

export function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: newId(),
    title: "",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    ...overrides,
  };
}

export function createCustomField(): CustomField {
  return { id: newId(), label: "", value: "" };
}
