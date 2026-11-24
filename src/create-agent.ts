import { createChatModel } from "./adapter/models/create-chat-model";
import { Agent } from "./application/agent";
import { AgentRunner } from "./application/agent-runner";
import type { AgentContext } from "./domain/agent";
import type { ModelInfo } from "./domain/model";

export function createAgent<TContext extends AgentContext>(
  context: TContext,
  model: ModelInfo,
): Agent {
  return new Agent(context, new AgentRunner(model, createChatModel));
}
