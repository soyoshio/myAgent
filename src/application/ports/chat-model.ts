import type { ChatMessage, ToolCall } from "../../domain/context";
import type { Tool } from "../../domain/tool";

/** 模型的一次回复：文本内容与请求的工具调用。 */
export interface AssistantReply {
  readonly content: string;
  readonly toolCalls: readonly ToolCall[];
}

export interface ChatModel {
  complete(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): Promise<AssistantReply>;
}
