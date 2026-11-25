import type { AgentModelFactory } from "../../application/ports/agent-model-factory";
import { AnthropicModel } from "./anthropic-model";
import { OpenAIModel } from "./openai-model";

export const createChatModel: AgentModelFactory = (modelConfig) => {
  switch (modelConfig.provider) {
    case "openai":
      return new OpenAIModel(modelConfig);
    case "anthropic":
      return new AnthropicModel(modelConfig);
    default:
      throw new Error(`不支持的模型厂商: ${modelConfig.provider}`);
  }
};
