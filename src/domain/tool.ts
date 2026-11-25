import type { AgentContext } from "./agent";

/**
 * 工具契约：暴露给模型的名称、用途和参数，以及模型调用时执行的逻辑。
 * 执行依赖当前的 AgentContext，返回的文本会作为该次工具调用的结果写回本轮。
 */
export interface Tool {
  readonly name: string;
  readonly description: string;
  /** 描述输入对象的 JSON Schema。 */
  readonly inputSchema: Readonly<Record<string, unknown>>;
  /** 执行工具，返回写入本轮的文本结果。 */
  execute(input: unknown, context: AgentContext): Promise<string>;
}
