import type {
  AssistantReply,
  ChatModel,
} from "../../application/ports/chat-model";
import type { ChatMessage } from "../../domain/context";
import type { ModelConfig } from "../../domain/model";
import type { Tool } from "../../domain/tool";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};
type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  }>;
}

function parseArguments(raw: string): unknown {
  const text = raw.trim();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function toAnthropicMessages(
  messages: readonly ChatMessage[],
): AnthropicMessage[] {
  const result: AnthropicMessage[] = [];

  for (const message of messages) {
    switch (message.role) {
      case "system":
        continue;
      case "user":
        result.push({ role: "user", content: message.content });
        continue;
      case "assistant": {
        const toolCalls = message.toolCalls ?? [];
        if (toolCalls.length === 0) {
          result.push({ role: "assistant", content: message.content });
          continue;
        }

        const blocks: AnthropicContentBlock[] = [];
        if (message.content.length > 0) {
          blocks.push({ type: "text", text: message.content });
        }
        for (const call of toolCalls) {
          blocks.push({
            type: "tool_use",
            id: call.id,
            name: call.name,
            input: parseArguments(call.arguments),
          });
        }
        result.push({ role: "assistant", content: blocks });
        continue;
      }
      case "tool": {
        const block: AnthropicToolResultBlock = {
          type: "tool_result",
          tool_use_id: message.toolCallId,
          content: message.content,
        };
        const last = result.at(-1);
        if (
          last !== undefined &&
          last.role === "user" &&
          Array.isArray(last.content)
        ) {
          last.content.push(block);
        } else {
          result.push({ role: "user", content: [block] });
        }
        continue;
      }
    }
  }

  return result;
}

export class AnthropicModel implements ChatModel {
  constructor(private readonly modelConfig: ModelConfig) {}

  async complete(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): Promise<AssistantReply> {
    const { name, apiKey, baseURL, maxTokens, temperature } = this.modelConfig;
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n");

    const response = await fetch(`${baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: name,
        max_tokens: maxTokens ?? 1024,
        ...(temperature === undefined ? {} : { temperature }),
        ...(system ? { system } : {}),
        ...(tools.length === 0
          ? {}
          : {
              tools: tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
              })),
            }),
        messages: toAnthropicMessages(messages),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Anthropic API 请求失败 (${response.status}): ${details}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const textParts: string[] = [];
    const toolCalls: { id: string; name: string; arguments: string }[] = [];

    for (const block of data.content ?? []) {
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      } else if (
        block.type === "tool_use" &&
        typeof block.id === "string" &&
        typeof block.name === "string"
      ) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        });
      }
    }

    const content = textParts.join("\n").trim();
    if (content.length === 0 && toolCalls.length === 0) {
      throw new Error("Anthropic 未返回内容。");
    }

    return { content, toolCalls };
  }
}
