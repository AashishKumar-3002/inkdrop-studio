import { createOpenAICompatibleProvider } from "./openaiCompatible";

/**
 * NVIDIA NIM — NVIDIA's hosted inference endpoints for open models,
 * OpenAI-protocol compatible at integrate.api.nvidia.com.
 *
 * NIM_BASE_URL lets a team point this at a self-hosted NIM container
 * (the same microservice runs on your own GPUs) without a code change.
 */
export const nvidiaProvider = createOpenAICompatibleProvider({
  id: "nvidia",
  label: "NVIDIA NIM",
  baseURL: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
  defaultModel: "meta/llama-3.3-70b-instruct",
  docsUrl: "https://build.nvidia.com",
  keyHint: "Starts with nvapi-",
  models: [
    { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B Instruct" },
    { id: "meta/llama-3.1-405b-instruct", label: "Llama 3.1 405B Instruct" },
    {
      id: "meta/llama-3.2-90b-vision-instruct",
      label: "Llama 3.2 90B Vision",
      vision: true,
    },
    {
      id: "nvidia/llama-3.1-nemotron-70b-instruct",
      label: "Nemotron 70B Instruct",
    },
    { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1" },
    { id: "qwen/qwen2.5-72b-instruct", label: "Qwen 2.5 72B Instruct" },
    { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B" },
    { id: "writer/palmyra-creative-122b", label: "Palmyra Creative 122B" },
  ],
});
