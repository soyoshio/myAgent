import { AbstractAgentTool } from "../../application/agent-tool";

/** 读取本地日期和时间，供模型按需调用。 */
export class ClockTool extends AbstractAgentTool {
  readonly name = "clock";
  readonly description = "获取当前的日期和时间。";
  readonly inputSchema: Readonly<Record<string, unknown>> = {
    type: "object",
    properties: {},
    additionalProperties: false,
  };

  async execute(): Promise<string> {
    const now = new Date();
    return `当前时间是 ${now.toLocaleString("zh-CN", {
      hour12: false,
    })}。`;
  }
}
