import type { ModelInfo } from "../../domain/model";
import type { ChatModel } from "./chat-model";

export type AgentModelFactory = (model: ModelInfo) => ChatModel;
