/** Minimal VAST linear-video player adapter. Configure the ad tag in index.html. */
export interface VideoAd {
  mediaUrl: string;
  title: string;
  clickThrough?: string;
  impressions: string[];
  tracking: Record<string, string[]>;
}

declare global {
  interface Window { AERORANK_AD_CONFIG?: { vastTagUrl?: string } }
}

const url = (value: string | undefined) => {
  try {
    const u = new URL(value || "", location.href);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch { return null; }
};

const text = (node: Element, tag: string) => node.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
const values = (node: Element, tag: string) => [...node.getElementsByTagName(tag)].map((n) => url(n.textContent?.trim())).filter((u): u is string => !!u);

/** Supports InLine and up to three VAST Wrappers, including their tracking URLs. */
export async function loadVideoAd(tagUrl: string, depth = 0, seen = new Set<string>()): Promise<VideoAd> {
  const safe = url(tagUrl);
  if (!safe || depth > 3 || seen.has(safe)) throw new Error("Ad unavailable");
  seen.add(safe);
  const response = await fetch(safe, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error("Ad unavailable");
  const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Invalid ad response");
  const ad = xml.getElementsByTagName("Ad")[0];
  if (!ad) throw new Error("No ad returned");
  const line = ad.getElementsByTagName("InLine")[0];
  const root = line || ad.getElementsByTagName("Wrapper")[0];
  if (!root) throw new Error("No playable ad");
  const impressions = values(root, "Impression");
  const tracking: Record<string, string[]> = {};
  for (const item of root.getElementsByTagName("Tracking")) {
    const event = item.getAttribute("event") || "";
    const beacon = url(item.textContent?.trim());
    if (event && beacon) (tracking[event] ||= []).push(beacon);
  }
  const clickTracking = values(root, "ClickTracking");
  if (clickTracking.length) (tracking.clickThrough ||= []).push(...clickTracking);
  if (!line) {
    const child = await loadVideoAd(text(root, "VASTAdTagURI"), depth + 1, seen);
    for (const [event, beacons] of Object.entries(tracking)) child.tracking[event] = [...(child.tracking[event] || []), ...beacons];
    child.impressions.push(...impressions);
    return child;
  }
  const files = [...line.getElementsByTagName("MediaFile")];
  const probe = document.createElement("video");
  const playable = files.find((f) => {
    const mime = f.getAttribute("type") || "";
    return ["video/mp4", "video/webm"].includes(mime) && !!probe.canPlayType(mime) && !!url(f.textContent?.trim());
  });
  const mediaUrl = url(playable?.textContent?.trim());
  if (!mediaUrl) throw new Error("No playable video");
  return { mediaUrl, title: text(line, "AdTitle") || "Sponsored video", clickThrough: url(text(line, "ClickThrough")) || undefined, impressions, tracking };
}

/** Fire only on playback, never just because the billboard was mounted. */
export function sendAdBeacons(urls: string[]) {
  for (const endpoint of urls) {
    const safe = url(endpoint);
    if (safe) { const img = new Image(); img.src = safe; }
  }
}