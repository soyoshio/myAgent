import type { AgentContext, AgentRuntime } from "../domain/agent";
import type { ChatMessage } from "../domain/context";
import type { AgentModelFactory } from "./ports/agent-model-factory";
import type { AssistantReply } from "./ports/chat-model";

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
    private readonly createModel: AgentModelFactory,
    private readonly runtime: AgentRuntime,
  ) {}

  complete(context: AgentContext, userMessage: ChatMessage): Promise<string> {
    return this.drive(this.run(context, userMessage, false));
  }

  stream(
    context: AgentContext,
    userMessage: ChatMessage,
  ): AsyncGenerator<string, string> {
    return this.run(context, userMessage, true);
  }

  /** 消费循环生成器，丢弃文本片段，只取最终答案。 */
  private async drive(gen: AsyncGenerator<string, string>): Promise<string> {
    for (;;) {
      const { value, done } = await gen.next();
      if (done) {
        return value;
      }
    }
  }

  private async *run(
    context: AgentContext,
    userMessage: ChatMessage,
    streamed: boolean,
  ): AsyncGenerator<string, string> {
    const history = await context.getMessages();
    const baseMessages: readonly ChatMessage[] = [...history, userMessage];

    const runtime = this.runtime.prepare
      ? await this.runtime.prepare(context, baseMessages)
      : this.runtime;
    const model = this.createModel(runtime.model);
    const tools = runtime.tools;
    const maxSteps = runtime.maxSteps ?? 8;
    const toolsByName = new Map(
      tools.map((tool) => [tool.name, tool] as const),
    );

    const prepared: readonly ChatMessage[] = context.prepareMessages
      ? await context.prepareMessages(baseMessages, runtime)
      : baseMessages;
    // 模型每一步都读取这份工作列表，包括准备阶段补充的消息。
    const messages: ChatMessage[] = [...prepared];
    // 单独记录本轮新增消息，收到最终回复后统一写入历史。
    const added: ChatMessage[] = [userMessage];

    for (let step = 0; step < maxSteps; step++) {
      let reply: AssistantReply;
      if (streamed) {
        reply = yield* model.stream([...messages], tools);
      } else {
        reply = await model.complete([...messages], tools);
      }

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

        // 成功和失败都按原调用 ID 回填，供模型下一步处理。
        const toolMessage: ChatMessage = {
          role: "tool",
          content: output,
          toolCallId: call.id,
        };
        messages.push(toolMessage);
        added.push(toolMessage);
      }
    }

    throw new Error(`超过最大工具调用轮数：${maxSteps}。`);
  }
}
