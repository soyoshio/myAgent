import type { ChatContext, ChatMessage } from "../../domain/context";

export class InMemoryContext implements ChatContext {
  private messages: ChatMessage[];

  constructor(initialMessages: readonly ChatMessage[] = []) {
    this.messages = [...initialMessages];
  }

  getMessages(): readonly ChatMessage[] {
    return [...this.messages];
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
  }
}
