export type ModelProvider = "openai" | "anthropic";

export interface ModelConfig {
  readonly provider: ModelProvider;
  readonly name: string;
  readonly apiKey: string;
  readonly baseURL: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}
