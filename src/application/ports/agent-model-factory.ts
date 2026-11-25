import type { ModelConfig } from "../../domain/model";
import type { ChatModel } from "./chat-model";

export type AgentModelFactory = (modelConfig: ModelConfig) => ChatModel;
