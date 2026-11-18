export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatContext {
  getMessages(): readonly ChatMessage[];
  addMessage(message: ChatMessage): void;
}
