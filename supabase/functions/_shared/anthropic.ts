import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "./cors.ts";

export const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-opus-5-5";

/**
 * Calls Claude with structured JSON output (output_config.format) so the
 * response always matches the schema the frontend renders.
 * Server-side refusal fallback is enabled ("default" routing).
 */
export async function claudeJson<T>(opts: {
  apiKey: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 2, timeout: 120_000 });

  // deno-lint-ignore no-explicit-any
  const params: any = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: opts.effort ?? "medium",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };

  let response;
  try {
    response = await client.beta.messages.stream(params).finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(502, "Anthropic API klíč je neplatný.");
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, "Anthropic rate limit — zkuste to za chvíli.");
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `Anthropic API: ${e.message}`);
    throw e;
  }

  if (response.stop_reason === "refusal") throw new HttpError(422, "Model požadavek odmítl. Upravte zadání.");
  if (response.stop_reason === "max_tokens") throw new HttpError(502, "Odpověď byla příliš dlouhá — zkuste kratší zadání.");

  let text = "";
  for (const block of response.content) {
    if (block.type === "text") text += block.text;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(502, "Model nevrátil platný JSON.");
  }
}

/* ---------- JSON-schema helpers (structured outputs need strict objects) ---------- */
export const str = { type: "string" } as const;
export const strArr = { type: "array", items: str } as const;
export const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export const arrOf = (items: unknown) => ({ type: "array", items });

/** Free-form call with optional server tools (e.g. web search). Returns the final text. */
export async function claudeText(opts: {
  apiKey: string;
  system: string;
  user: string;
  // deno-lint-ignore no-explicit-any
  tools?: any[];
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 2, timeout: 280_000 });
  // deno-lint-ignore no-explicit-any
  const messages: any[] = [{ role: "user", content: opts.user }];
  for (let round = 0; round < 4; round++) {
    let response;
    try {
      // deno-lint-ignore no-explicit-any
      const params: any = {
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens ?? 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: opts.effort ?? "medium" },
        system: opts.system,
        messages,
        tools: opts.tools,
      };
      response = await client.beta.messages.stream(params).finalMessage();
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw new HttpError(502, `Anthropic API: ${e.message}`);
      throw e;
    }
    if (response.stop_reason === "refusal") throw new HttpError(422, "Model požadavek odmítl.");
    if (response.stop_reason === "pause_turn") {
      // Server tool loop paused — send the turn back to let it continue.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    let text = "";
    for (const block of response.content) if (block.type === "text") text += block.text;
    return text;
  }
  throw new HttpError(504, "Hledání trvalo příliš dlouho.");
}

/** Extracts the first JSON value from model text (tolerates prose or code fences around it). */
export function extractJson<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [text.trim(), fence?.[1]?.trim() ?? ""];
  const firstArr = text.indexOf("["), firstObj = text.indexOf("{");
  const start = [firstArr, firstObj].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (start !== undefined) {
    const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
    if (end > start) candidates.push(text.slice(start, end + 1));
  }
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c) as T;
    } catch {
      /* try next */
    }
  }
  throw new HttpError(502, "Model nevrátil platný JSON.");
}
