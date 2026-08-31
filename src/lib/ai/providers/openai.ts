import { createOpenAICompatibleProvider } from "./openaiCompatible";

export const openaiProvider = createOpenAICompatibleProvider({
  id: "openai",
  label: "OpenAI",
  defaultModel: "gpt-4.1",
  docsUrl: "https://platform.openai.com/api-keys",
  keyHint: "Starts with sk-",
  models: [
    { id: "gpt-4.1", label: "GPT-4.1", vision: true },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", vision: true },
    { id: "gpt-4o", label: "GPT-4o", vision: true },
    { id: "o3", label: "o3" },
    { id: "o4-mini", label: "o4-mini" },
  ],
});
