import Anthropic from "@anthropic-ai/sdk";

/**
 * Thin wrapper around the Anthropic SDK with two conveniences the app relies on:
 *  1. `hasApiKey()` so routes can fall back to demo mode when no key is set.
 *  2. `generateStructured()` which forces tool-use so Claude always returns
 *     schema-valid JSON — no brittle string parsing.
 */

const MODEL = process.env.CREATIVE_MODEL ?? "claude-sonnet-5";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Ask Claude to fill a JSON schema and return the validated object.
 * Uses forced tool-use so the response is guaranteed to match the shape.
 */
export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  toolName: string;
  maxTokens?: number;
}): Promise<T> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    tools: [
      {
        name: opts.toolName,
        description: "Return the requested structured result.",
        input_schema: opts.schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [{ role: "user", content: opts.prompt }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return structured output.");
  }
  return block.input as T;
}
