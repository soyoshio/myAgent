import type { AgentContext } from "../domain/agent";
import type { Tool } from "../domain/tool";

/** 工具基类：以抽象成员实现 `Tool`，子类只需提供元数据并实现类型化的 `execute`。 */
export abstract class AbstractAgentTool<TInput = unknown> implements Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Readonly<Record<string, unknown>>;
  abstract execute(input: TInput, context: AgentContext): Promise<string>;
}
