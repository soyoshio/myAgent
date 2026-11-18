import type { ChatModel } from "../../application/ports/chat-model";
import { AnthropicModel } from "./anthropic-model";
import { OpenAIModel } from "./openai-model";

export function createChatModel(): ChatModel {
  const provider = (process.env.MODEL_PROVIDER ?? "openai").toLowerCase();

  switch (provider) {
    case "openai":
      return new OpenAIModel();
    case "anthropic":
      return new AnthropicModel();
    default:
      throw new Error(
        `不支持的 MODEL_PROVIDER: ${provider}，可选值为 openai 或 anthropic。`,
      );
  }
}
