import type { AgentContext } from "../domain/agent";
import type { ChatModel } from "./ports/chat-model";

export class Agent {
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly context: AgentContext,
    private readonly model: ChatModel,
  ) {}

  complete(input: string): Promise<string> {
    const turn = this.pending.then(() => this.completeTurn(input));
    this.pending = turn.then(
      () => undefined,
      () => undefined,
    );
    return turn;
  }

  private async completeTurn(input: string): Promise<string> {
    const content = input.trim();
    if (!content) {
      throw new Error("输入不能为空。");
    }

    const userMessage = { role: "user", content } as const;
    const history = await this.context.getMessages();
    const messages = [...history, userMessage];
    const prepared = this.context.prepareMessages
      ? await this.context.prepareMessages(messages)
      : messages;
    const answer = await this.model.complete(prepared);

    await this.context.addMessages([
      userMessage,
      { role: "assistant", content: answer },
    ]);
    return answer;
  }
}
