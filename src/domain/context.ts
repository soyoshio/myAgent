export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  readonly role: MessageRole;
  readonly content: string;
}

export interface ChatContext {
  getMessages(): readonly ChatMessage[] | Promise<readonly ChatMessage[]>;
  /** 将同一轮的消息一起保存。写入失败时应保留之前的历史。 */
  addMessages(messages: readonly ChatMessage[]): void | Promise<void>;
}
