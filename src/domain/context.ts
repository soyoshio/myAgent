export type MessageRole = "system" | "user" | "assistant" | "tool";

/** 模型请求的一次工具调用。 */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  /** 模型给出的参数，原始 JSON 字符串。 */
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
  /** 模型请求的工具调用；为空表示纯文本回复。 */
  readonly toolCalls?: readonly ToolCall[];
}

export interface ToolMessage {
  readonly role: "tool";
  readonly content: string;
  readonly toolCallId: string;
}

export type ChatMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;

export interface ChatContext {
  getMessages(): readonly ChatMessage[] | Promise<readonly ChatMessage[]>;
  /** 将同一轮的消息一起保存。写入失败时应保留之前的历史。 */
  addMessages(messages: readonly ChatMessage[]): void | Promise<void>;
}
