import type { ChatMessage } from "../../domain/context";

export interface ChatModel {
  complete(messages: readonly ChatMessage[]): Promise<string>;
}
