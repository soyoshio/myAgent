import OpenAI from "openai";
import type {
  AssistantReply,
  ChatModel,
} from "../../application/ports/chat-model";
import type { ChatMessage } from "../../domain/context";
import type { ModelConfig } from "../../domain/model";
import type { Tool } from "../../domain/tool";

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function toOpenAIMessage(message: ChatMessage): OpenAIMessage {
  switch (message.role) {
    case "system":
      return { role: "system", content: message.content };
    case "user":
      return { role: "user", content: message.content };
    case "assistant": {
      const toolCalls = message.toolCalls ?? [];
      if (toolCalls.length === 0) {
        return { role: "assistant", content: message.content };
      }

      return {
        role: "assistant",
        content: message.content.length > 0 ? message.content : null,
        tool_calls: toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      };
    }
    case "tool":
      return {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId,
      };
  }
}

export class OpenAIModel implements ChatModel {
  private readonly client: OpenAI;

  constructor(private readonly modelConfig: ModelConfig) {
    this.client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseURL,
    });
  }

  async complete(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): Promise<AssistantReply> {
    const { name, maxTokens, temperature } = this.modelConfig;
    const response = await this.client.chat.completions.create({
      model: name,
      ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
      ...(temperature === undefined ? {} : { temperature }),
      messages: messages.map(toOpenAIMessage),
      ...(tools.length === 0
        ? {}
        : {
            tools: tools.map((tool) => ({
              type: "function" as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
              },
            })),
          }),
    });

    const message = response.choices[0]?.message;
    if (message === undefined) {
      throw new Error("OpenAI 未返回消息。");
    }

    const toolCalls = (message.tool_calls ?? []).flatMap((call) =>
      call.type === "function"
        ? [
            {
              id: call.id,
              name: call.function.name,
              arguments: call.function.arguments,
            },
          ]
        : [],
    );
    const content = message.content?.trim() ?? "";

    if (content.length === 0 && toolCalls.length === 0) {
      throw new Error("OpenAI 未返回文本内容。");
    }

    return { content, toolCalls };
  }
}
