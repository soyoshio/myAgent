import type { ChatContext, ChatMessage } from "./context";

export interface AgentContext extends ChatContext {
  /** 可选地构建当前轮发给模型的消息。传入历史和本轮用户消息。 */
  prepareMessages?(
    messages: readonly ChatMessage[],
  ): readonly ChatMessage[] | Promise<readonly ChatMessage[]>;
}
