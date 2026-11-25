import type { AgentContext } from "../domain/agent";
import type { AgentLoop } from "./agent-loop";

export class Agent {
  private turnQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly context: AgentContext,
    private readonly loop: AgentLoop,
  ) {}

  complete(input: string): Promise<string> {
    const turn = this.turnQueue.then(() => this.completeTurn(input));
    this.turnQueue = turn.then(
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

    return this.loop.complete(this.context, { role: "user", content });
  }
}
