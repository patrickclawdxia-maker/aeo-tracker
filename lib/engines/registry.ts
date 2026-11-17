export interface Engine {
  id: string;
  name: string;
  model: string;
  provider: string;
}

export const engines: Engine[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    model: "gpt-5-mini",
    provider: "OpenAI",
  },
  {
    id: "gemini",
    name: "Gemini",
    model: "gemini-3-flash",
    provider: "Google",
  },
  {
    id: "claude",
    name: "Claude",
    model: "claude-sonnet-4.6",
    provider: "Anthropic",
  },
];

export function getEngineById(id: string): Engine | undefined {
  return engines.find((e) => e.id === id);
}

export const ENGINE_IDS = engines.map((e) => e.id);
