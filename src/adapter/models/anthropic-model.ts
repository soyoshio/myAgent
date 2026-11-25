import type {
  AssistantReply,
  ChatModel,
} from "../../application/ports/chat-model";
import type { ChatMessage, ToolCall } from "../../domain/context";
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

interface AnthropicStreamEvent {
  readonly type?: string;
  readonly index?: number;
  readonly content_block?: {
    readonly type?: string;
    readonly id?: string;
    readonly name?: string;
  };
  readonly delta?: {
    readonly type?: string;
    readonly text?: string;
    readonly partial_json?: string;
  };
  readonly error?: {
    readonly message?: string;
  };
}

/** 从一段 SSE 事件里取出 data 行并解析。 */
function parseStreamEvent(raw: string): AnthropicStreamEvent | undefined {
  const data = raw
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!data) {
    return undefined;
  }

  try {
    return JSON.parse(data) as AnthropicStreamEvent;
  } catch {
    return undefined;
  }
}

interface PendingToolBlock {
  readonly id: string;
  readonly name: string;
  json: string;
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

  async *stream(
    messages: readonly ChatMessage[],
    tools: readonly Tool[],
  ): AsyncGenerator<string, AssistantReply> {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Anthropic API 请求失败 (${response.status}): ${details}`);
    }

    const body = response.body;
    if (body === null) {
      throw new Error("Anthropic 未返回响应体。");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    const toolBlocks = new Map<number, PendingToolBlock>();

    const applyEvent = (event: AnthropicStreamEvent): string | undefined => {
      if (event.type === "error") {
        throw new Error(
          `Anthropic 流式响应出错：${event.error?.message ?? "未知错误"}`,
        );
      }

      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block?.type === "tool_use") {
          toolBlocks.set(event.index ?? 0, {
            id: block.id ?? "",
            name: block.name ?? "",
            json: "",
          });
        }
        return undefined;
      }

      if (event.type === "content_block_delta") {
        const delta = event.delta;
        if (delta?.type === "text_delta" && typeof delta.text === "string") {
          text += delta.text;
          return delta.text;
        }
        if (
          delta?.type === "input_json_delta" &&
          typeof delta.partial_json === "string"
        ) {
          const block = toolBlocks.get(event.index ?? 0);
          if (block !== undefined) {
            block.json += delta.partial_json;
          }
        }
      }

      return undefined;
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value !== undefined) {
          buffer += decoder.decode(value, { stream: true });
        }
        buffer = buffer.replace(/\r\n/g, "\n");

        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          const event = parseStreamEvent(raw);
          if (event === undefined) {
            continue;
          }

          const delta = applyEvent(event);
          if (delta !== undefined) {
            yield delta;
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    // 处理最后一个没有空行结尾的事件。
    const leftover = parseStreamEvent(buffer);
    if (leftover !== undefined) {
      const delta = applyEvent(leftover);
      if (delta !== undefined) {
        yield delta;
      }
    }

    const toolCalls: ToolCall[] = [];
    const ordered = [...toolBlocks.entries()].sort((a, b) => a[0] - b[0]);
    for (const [, block] of ordered) {
      if (block.id.length > 0 && block.name.length > 0) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.json.length > 0 ? block.json : "{}",
        });
      }
    }

    const content = text.trim();
    if (content.length === 0 && toolCalls.length === 0) {
      throw new Error("Anthropic 未返回内容。");
    }

    return { content, toolCalls };
  }
}
