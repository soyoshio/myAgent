import OpenAI from "openai";
import type { ChatModel } from "../../application/ports/chat-model";
import type { ChatMessage } from "../../domain/context";
import type { ModelInfo } from "../../domain/model";

export class OpenAIModel implements ChatModel {
  private readonly client: OpenAI;

  constructor(private readonly model: ModelInfo) {
    this.client = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.baseURL,
    });
  }

  async complete(messages: readonly ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model.name,
      ...(this.model.maxTokens === undefined
        ? {}
        : { max_tokens: this.model.maxTokens }),
      ...(this.model.temperature === undefined
        ? {}
        : { temperature: this.model.temperature }),
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
