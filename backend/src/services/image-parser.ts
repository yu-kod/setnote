import Anthropic from "@anthropic-ai/sdk";

export type ParsedTrack = {
  title: string;
  artist: string;
};

const SYSTEM_PROMPT = `あなたはDJソフト（rekordbox, Serato, Traktor等）のプレイリスト画面のスクリーンショットから、トラック情報を抽出するアシスタントです。

画像からトラックタイトルとアーティスト名を読み取り、JSON配列として返してください。

ルール:
- 画像に表示されている順番通りに返す
- トラックタイトルとアーティスト名が読み取れない場合は空文字にする
- 余計な説明は不要。JSON配列のみ返す
- フォーマット: [{"title": "曲名", "artist": "アーティスト名"}, ...]`;

export async function parseTracksFromImage(
  imageBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"
): Promise<ParsedTrack[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "この画像からトラックタイトルとアーティスト名を抽出してJSON配列で返してください。",
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return [];
  }

  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
  /* v8 ignore next 3 -- regex guarantees []-wrapped input, so JSON.parse always yields an array */
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (item): item is { title: string; artist: string } =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        typeof item.title === "string"
    )
    .map((item) => ({
      title: item.title,
      artist: typeof item.artist === "string" ? item.artist : "",
    }));
}
