import type { ChatMessage } from "../domain/context";
import type { ModelInfo } from "../domain/model";
import type { AgentModelFactory } from "./ports/agent-model-factory";
import type { ChatModel } from "./ports/chat-model";

export class AgentRunner implements ChatModel {
  constructor(
    private readonly modelInfo: ModelInfo,
    private readonly createModel: AgentModelFactory,
  ) {}

  async complete(messages: readonly ChatMessage[]): Promise<string> {
    return this.createModel(this.modelInfo).complete(messages);
  }
}
