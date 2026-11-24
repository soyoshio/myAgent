import type { AgentModelFactory } from "../../application/ports/agent-model-factory";
import { AnthropicModel } from "./anthropic-model";
import { OpenAIModel } from "./openai-model";

export const createChatModel: AgentModelFactory = (model) => {
  switch (model.provider) {
    case "openai":
      return new OpenAIModel(model);
    case "anthropic":
      return new AnthropicModel(model);
    default:
      throw new Error(`不支持的模型厂商: ${model.provider}`);
  }
};
