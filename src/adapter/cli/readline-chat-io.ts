import { createInterface } from "node:readline/promises";
import type { ChatInput, ChatOutput } from "../../application/ports/chat-io";

export class ReadlineChatIO implements ChatInput, ChatOutput {
  private readonly readline: ReturnType<typeof createInterface>;

  constructor() {
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async read(): Promise<string | null> {
    try {
      return await this.readline.question("你: ");
    } catch {
      return null;
    }
  }

  write(message: string): void {
    console.log(message);
  }

  close(): void {
    this.readline.close();
  }
}
