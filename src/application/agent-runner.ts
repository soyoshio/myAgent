import type { ChatMessage } from "../domain/context";
import type { ModelConfig } from "../domain/model";
import type { Tool } from "../domain/tool";
import type { AgentModelFactory } from "./ports/agent-model-factory";
import type { AssistantReply, ChatModel } from "./ports/chat-model";

export class AgentRunner implements ChatModel {
  constructor(
    private readonly modelConfig: ModelConfig,
    private readonly createModel: AgentModelFactory,
  ) {}

  async complete(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): Promise<AssistantReply> {
    return this.createModel(this.modelConfig).complete(messages, tools);
  }
}
