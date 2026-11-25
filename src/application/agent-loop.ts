import type { AgentContext } from "../domain/agent";
import type { ChatMessage } from "../domain/context";
import type { Tool } from "../domain/tool";
import type { ChatModel } from "./ports/chat-model";

function parseArguments(raw: string): unknown {
  const text = raw.trim();
  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class AgentLoop {
  constructor(
    private readonly model: ChatModel,
    private readonly tools: readonly Tool[] = [],
    private readonly maxSteps = 8,
  ) {}

  async complete(
    context: AgentContext,
    userMessage: ChatMessage,
  ): Promise<string> {
    const toolsByName = new Map(
      this.tools.map((tool) => [tool.name, tool] as const),
    );

    const history = await context.getMessages();
    const baseMessages: readonly ChatMessage[] = [...history, userMessage];
    const prepared: readonly ChatMessage[] = context.prepareMessages
      ? await context.prepareMessages(baseMessages)
      : baseMessages;
    const messages: ChatMessage[] = [...prepared];
    const added: ChatMessage[] = [userMessage];

    for (let step = 0; step < this.maxSteps; step++) {
      const reply = await this.model.complete([...messages], this.tools);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: reply.content,
        toolCalls: reply.toolCalls,
      };
      messages.push(assistantMessage);
      added.push(assistantMessage);

      if (reply.toolCalls.length === 0) {
        await context.addMessages(added);
        return reply.content;
      }

      for (const call of reply.toolCalls) {
        const tool = toolsByName.get(call.name);
        let output: string;

        if (tool === undefined) {
          output = `未知工具：${call.name}`;
        } else {
          try {
            output = await tool.execute(
              parseArguments(call.arguments),
              context,
            );
          } catch (error) {
            output = `工具执行失败：${describeError(error)}`;
          }
        }

        const toolMessage: ChatMessage = {
          role: "tool",
          content: output,
          toolCallId: call.id,
        };
        messages.push(toolMessage);
        added.push(toolMessage);
      }
    }

    throw new Error(`超过最大工具调用轮数：${this.maxSteps}。`);
  }
}
