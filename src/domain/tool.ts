import type { AgentContext } from "./agent";

/** 模型可调用的工具，包含元数据和执行逻辑。 */
export interface Tool {
  readonly name: string;
  readonly description: string;
  /** 提供给模型的参数 JSON Schema。运行时校验由工具实现负责。 */
  readonly inputSchema: Readonly<Record<string, unknown>>;
  /** 使用解析后的参数和智能体上下文执行工具，返回交给模型的结果文本。 */
  execute(input: unknown, context: AgentContext): Promise<string>;
}
