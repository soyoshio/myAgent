import { createChatModel } from "./adapter/models/create-chat-model";
import { Agent } from "./application/agent";
import { AgentLoop } from "./application/agent-loop";
import { AgentRunner } from "./application/agent-runner";
import type { AgentContext } from "./domain/agent";
import type { ModelConfig } from "./domain/model";
import type { Tool } from "./domain/tool";

export function createAgent<TContext extends AgentContext>(
  context: TContext,
  modelConfig: ModelConfig,
  tools: readonly Tool[] = [],
): Agent {
  const runner = new AgentRunner(modelConfig, createChatModel);
  return new Agent(context, new AgentLoop(runner, tools));
}
