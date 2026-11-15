export async function describeImage(url: string): Promise<{ title: string; description: string } | null> {
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
        max_tokens: 350,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Retourne uniquement un objet JSON avec title (titre français court de 2 à 5 mots, maximum 120 caractères) et description (1 à 3 phrases françaises concrètes : nature, matière, couleur, style et détails visibles). Sans supposition.",
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
    if (typeof text !== "string") return null;
    const parsed = JSON.parse(text);
    if (typeof parsed.title !== "string" || typeof parsed.description !== "string") return null;
    const title = parsed.title.trim().slice(0, 120);
    const description = parsed.description.trim().slice(0, 3000);
    return title && description ? { title, description } : null;
  } catch {
    return null;
  }
}
