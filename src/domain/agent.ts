import type { ChatContext, ChatMessage } from "./context";
import type { ModelConfig } from "./model";
import type { Tool } from "./tool";

/** 一轮对话的运行期配置，包含模型、工具和模型请求上限。 */
export interface AgentRuntime {
  readonly model: ModelConfig;
  readonly tools: readonly Tool[];
  /** 单个对话轮次最多发送的模型请求数，默认为 8。 */
  readonly maxSteps?: number;

  /**
   * 在 `prepareMessages()` 之前调用一次，确定本轮的运行期配置。
   *
   * @param context 当前的智能体上下文。
   * @param messages 已保存的历史和本轮用户消息。
   * @returns 仅在本轮生效的完整运行期配置。
   */
  prepare?(
    context: AgentContext,
    messages: readonly ChatMessage[],
  ): AgentRuntime | Promise<AgentRuntime>;
}

/** 管理对话历史，并在每轮开始时准备模型消息。 */
export interface AgentContext extends ChatContext {
  /**
   * 在首次请求模型前调用一次，可整理消息或更新上下文状态。
   *
   * @param messages 已保存的历史和本轮用户消息。
   * @param runtime 本轮实际使用的运行期配置。
   * @returns 本轮的初始模型消息。后续请求以此为起点，追加助手消息和工具结果。
   */
  prepareMessages?(
    messages: readonly ChatMessage[],
    runtime: AgentRuntime,
  ): readonly ChatMessage[] | Promise<readonly ChatMessage[]>;
}
