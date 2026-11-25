import { createChatModel } from "./adapter/models/create-chat-model";
import { Agent } from "./application/agent";
import { AgentLoop } from "./application/agent-loop";
import type { AgentContext, AgentRuntime } from "./domain/agent";

/**
 * 创建使用指定上下文和运行期配置的 Agent。
 *
 * @param context 负责读写历史并准备模型消息。
 * @param runtime 提供模型、工具和模型请求上限，可通过 `prepare()` 按轮调整配置。
 */
export function createAgent(
  context: AgentContext,
  runtime: AgentRuntime,
): Agent {
  return new Agent(context, new AgentLoop(createChatModel, runtime));
}
