import { afterEach, expect, it, vi } from "vitest";
import { describeImage } from "./ai";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("does not call OpenAI without a key", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(await describeImage("https://photo.example")).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it("requests and validates a French title and description", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({title: "Chaise en bois", description: "Une chaise brune."}) } }] }));
  vi.stubGlobal("fetch", fetcher);
  expect(await describeImage("https://photo.example")).toEqual({ title: "Chaise en bois", description: "Une chaise brune." });
  expect(JSON.parse(fetcher.mock.calls[0][1].body).response_format).toEqual({ type: "json_object" });
});
it.each(["invalid json", '{}', '{"title":12,"description":"test"}'])("degrades on malformed vision output: %s", async (content) => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({choices: [{message: {content}}]})));
  expect(await describeImage("https://photo.example")).toBeNull();
});
it("degrades on network failure", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(await describeImage("https://photo.example")).toBeNull();
});
