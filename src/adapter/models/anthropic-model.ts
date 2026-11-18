import type { ChatModel } from "../../application/ports/chat-model";
import type { ChatMessage } from "../../domain/context";

export interface AnthropicModelConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

export class AnthropicModel implements ChatModel {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseURL: string;

  constructor(config: AnthropicModelConfig = {}) {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("请设置 ANTHROPIC_API_KEY 环境变量。");
    }

    const baseURL = config.baseURL ?? process.env.ANTHROPIC_BASE_URL;
    if (!baseURL) {
      throw new Error("请设置 ANTHROPIC_BASE_URL 环境变量。");
    }

    const model = config.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new Error("请设置 ANTHROPIC_MODEL 环境变量。");
    }

    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
  }

  async complete(messages: readonly ChatMessage[]): Promise<string> {
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n");

    const conversation = messages.flatMap((message) => {
      if (message.role === "system") {
        return [];
      }

      return [{ role: message.role, content: message.content }];
    });

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: system || undefined,
        messages: conversation,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Anthropic API 请求失败 (${response.status}): ${details}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const content = (data.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!content) {
      throw new Error("Anthropic 未返回文本内容。");
    }

    return content;
  }
}
