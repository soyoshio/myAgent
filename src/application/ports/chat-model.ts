import type { ChatMessage, ToolCall } from "../../domain/context";
import type { Tool } from "../../domain/tool";

/** 单次模型请求返回的文本和工具调用列表。 */
export interface AssistantReply {
  readonly content: string;
  readonly toolCalls: readonly ToolCall[];
}

/** 模型适配器统一实现的单次请求接口。 */
export interface ChatModel {
  /** 一次性返回本轮完整回复。 */
  complete(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): Promise<AssistantReply>;
  /**
   * 流式产出本轮文本片段，迭代结束时返回本轮完整回复（含工具调用）。
   * 工具调用不会作为片段产出，但会随返回值带回给调用方。
   */
  stream(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): AsyncGenerator<string, AssistantReply>;
}
