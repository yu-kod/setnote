const YOUTUBE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;

export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE);
  return match ? match[1] : null;
}

export function getThumbnailProxyUrl(songLink: string): string | null {
  const videoId = getYouTubeVideoId(songLink);
  if (!videoId) return null;
  return `/api/proxy/thumbnail?videoId=${videoId}`;
}
