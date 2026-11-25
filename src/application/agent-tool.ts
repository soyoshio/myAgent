import type { AgentContext } from "../domain/agent";
import type { Tool } from "../domain/tool";

/** 自定义工具可继承此基类，用 `TInput` 声明 `execute()` 的参数类型。 */
export abstract class AbstractAgentTool<TInput = unknown> implements Tool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Readonly<Record<string, unknown>>;
  abstract execute(input: TInput, context: AgentContext): Promise<string>;
}
