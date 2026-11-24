import type { ChatModel } from "../../application/ports/chat-model";
import type { ChatMessage } from "../../domain/context";
import type { ModelInfo } from "../../domain/model";

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

export class AnthropicModel implements ChatModel {
  constructor(private readonly model: ModelInfo) {}

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

    const response = await fetch(`${this.model.baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": this.model.apiKey,
      },
      body: JSON.stringify({
        model: this.model.name,
        max_tokens: this.model.maxTokens ?? 1024,
        ...(this.model.temperature === undefined
          ? {}
          : { temperature: this.model.temperature }),
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
