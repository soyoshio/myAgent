export type MessageRole = "system" | "user" | "assistant" | "tool";

/** 模型请求的一次工具调用。 */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  /** 待执行工具的参数，以 JSON 字符串表示。 */
  readonly arguments: string;
}

export interface SystemMessage {
  readonly role: "system";
  readonly content: string;
}

export interface UserMessage {
  readonly role: "user";
  readonly content: string;
}

export interface AssistantMessage {
  readonly role: "assistant";
  readonly content: string;
  /** 模型请求的工具调用列表。省略或为空时表示本条消息无工具调用。 */
  readonly toolCalls?: readonly ToolCall[];
}

export interface ToolMessage {
  readonly role: "tool";
  readonly content: string;
  /** 与本结果对应的 `ToolCall.id`。 */
  readonly toolCallId: string;
}

export type ChatMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;

/** 对话历史的读写契约。 */
export interface ChatContext {
  /** 按对话顺序返回已保存的消息。 */
  getMessages(): readonly ChatMessage[] | Promise<readonly ChatMessage[]>;
  /** 一次性追加本轮消息。写入失败时应保留提交前的历史。 */
  addMessages(messages: readonly ChatMessage[]): void | Promise<void>;
}
