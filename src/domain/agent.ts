import type { ChatContext, ChatMessage } from "./context";

export interface AgentContext extends ChatContext {
  /** 可选地构建发给模型的消息。参数包含历史、本轮用户消息和工具结果。 */
  prepareMessages?(
    messages: readonly ChatMessage[],
  ): readonly ChatMessage[] | Promise<readonly ChatMessage[]>;
}
