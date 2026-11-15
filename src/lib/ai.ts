export const EMBEDDING_MODEL = "google/embeddinggemma-2";
export function vectorLiteral(vector: number[]) {
  if (vector.length !== 768 || vector.some((n) => !Number.isFinite(n)))
    throw new Error("Vecteur invalide.");
  return `[${vector.join(",")}]`;
}
export function embeddingConfigured() {
  return Boolean(process.env.EMBED_URL && process.env.EMBED_API_KEY);
}
export async function embed(
  text: string,
  kind: "document" | "query",
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!embeddingConfigured() || !text.trim()) return null;
  const base = process.env.EMBED_URL!;
  try {
    const url = new URL(base);
    if (
      url.protocol !== "https:" ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
  } catch {
    return null;
  }
  // This service supports exactly one model. Do not silently send a different one.
  if (process.env.EMBED_MODEL && process.env.EMBED_MODEL !== EMBEDDING_MODEL)
    return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(
        `${base.replace(/\/$/, "")}/v1/embeddings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.EMBED_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: [
              kind === "document"
                ? `title: none | text: ${text}`
                : `task: search result | query: ${text}`,
            ],
            dimensions: 768,
          }),
          signal: AbortSignal.timeout(45000),
        },
      );
      if (!response.ok) throw new Error("Service indisponible");
      const body = await response.json();
      return vectorLiteral(body.data[0].embedding);
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}
export async function describeImage(url: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
        max_tokens: 250,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Décris cet objet en français en 1 à 3 phrases courtes, concrètes et utiles pour la recherche : nature, matière, couleur, style, détails remarquables et taille approximative seulement si évidente. Sans remplissage ni supposition, avec une légère chaleur si approprié.",
              },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim().slice(0, 3000) : null;
  } catch {
    return null;
  }
}
export function rrf<T extends { id: string }>(rankings: T[][], k = 60): T[] {
  const scores = new Map<string, { item: T; score: number }>();
  for (const ranking of rankings) {
    const seen = new Set<string>();
    ranking.forEach((item, index) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      const prior = scores.get(item.id);
      scores.set(item.id, {
        item: prior?.item ?? item,
        score: (prior?.score ?? 0) + 1 / (k + index + 1),
      });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .map((x) => x.item);
}
