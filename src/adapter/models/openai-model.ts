import OpenAI from "openai";
import type { ChatModel } from "../../application/ports/chat-model";
import type { ChatMessage } from "../../domain/context";

export interface OpenAIModelConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class OpenAIModel implements ChatModel {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAIModelConfig = {}) {
    const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("请设置 OPENAI_API_KEY 环境变量。");
    }
    const baseURL = config.baseURL ?? process.env.OPENAI_BASE_URL;

    this.client = new OpenAI({ apiKey, baseURL });
    const model = config.model ?? process.env.OPENAI_MODEL;
    if (!model) {
      throw new Error("请设置 OPENAI_MODEL 环境变量。");
    }
    this.model = model;
  }

  async complete(messages: readonly ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map<OpenAI.Chat.Completions.ChatCompletionMessageParam>(
        (message) => {
          switch (message.role) {
            case "system":
              return { role: "system", content: message.content };
            case "user":
              return { role: "user", content: message.content };
            case "assistant":
              return { role: "assistant", content: message.content };
          }
        },
      ),
    });

    const content = response.choices[0]?.message.content?.trim();
    if (!content) {
      throw new Error("OpenAI 未返回文本内容。");
    }

    return content;
  }
}
