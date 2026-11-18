import type { ChatContext } from "../domain/context";
import type { ChatInput, ChatOutput } from "./ports/chat-io";
import type { ChatModel } from "./ports/chat-model";

export class ChatLoop {
  constructor(
    private readonly model: ChatModel,
    private readonly context: ChatContext,
    private readonly input: ChatInput,
    private readonly output: ChatOutput,
  ) {}

  async run(): Promise<void> {
    this.output.write("简单智能体已启动，输入 exit 或 quit 退出。");

    while (true) {
      const input = await this.input.read();
      if (input === null || ["exit", "quit"].includes(input.trim().toLowerCase())) {
        break;
      }

      const content = input.trim();
      if (!content) {
        continue;
      }

      const userMessage = { role: "user", content } as const;

      try {
        const answer = await this.model.complete([
          ...this.context.getMessages(),
          userMessage,
        ]);

        this.context.addMessage(userMessage);
        this.context.addMessage({ role: "assistant", content: answer });
        this.output.write(`智能体: ${answer}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.output.write(`调用模型失败: ${message}`);
      }
    }

    this.output.write("已退出。");
  }
}
