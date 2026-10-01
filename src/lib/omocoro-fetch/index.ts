// Identify ourselves to omocoro.jp so the operators can tell who is crawling
// and how to reach us, instead of seeing an anonymous Node fetch.
const USER_AGENT = "omocoro-archive/1.0 (+https://omocoro-archive.kkweb.io)";

export default async function fetchOmocoro(url: string): Promise<Response> {
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}
