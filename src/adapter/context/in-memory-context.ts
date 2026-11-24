import type { AgentContext } from "../../domain/agent";
import type { ChatMessage } from "../../domain/context";

export class InMemoryContext implements AgentContext {
  private readonly messages: ChatMessage[];

  constructor(initialMessages: readonly ChatMessage[] = []) {
    this.messages = [...initialMessages];
  }

  getMessages(): readonly ChatMessage[] {
    return [...this.messages];
  }

  prepareMessages(
    messages: readonly ChatMessage[],
  ): readonly ChatMessage[] | Promise<readonly ChatMessage[]> {
    return messages;
  }

  addMessages(messages: readonly ChatMessage[]): void {
    this.messages.push(...messages);
  }
}
