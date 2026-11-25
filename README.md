# myAgent

一个使用 TypeScript 编写的简单智能体库，按领域层、应用层和适配层组织代码，支持 OpenAI 与 Anthropic。

## 目录结构

```text
src/
├── domain/
│   ├── context.ts                  # 消息（含工具调用）与历史读写接口
│   ├── agent.ts                    # 用户上下文与每轮准备接口
│   ├── model.ts                    # 模型配置与厂商类型
│   └── tool.ts                     # 工具契约（元数据 + execute）
├── application/
│   ├── agent.ts                    # Agent 入口，串行执行每一轮
│   ├── agent-loop.ts               # 智能体循环：调模型、执行工具、再调模型
│   ├── agent-tool.ts               # AbstractAgentTool 基类
│   ├── agent-runner.ts             # 通过模型工厂执行调用
│   └── ports/
│       ├── agent-model-factory.ts  # 模型工厂接口
│       └── chat-model.ts           # 模型接口（接收工具、返回工具调用）
├── adapter/
│   ├── context/
│   │   └── in-memory-context.ts    # 内存上下文实现
│   ├── models/
│   │   ├── openai-model.ts         # OpenAI API
│   │   ├── anthropic-model.ts      # Anthropic API
│   │   └── create-chat-model.ts    # 按厂商实例化模型
│   └── tools/
│       └── clock-tool.ts           # 基于 AbstractAgentTool 的时钟工具
├── create-agent.ts                 # 组合适配器与应用层
├── cli.ts                          # 命令行入口
└── index.ts                        # 公共 API 导出
```

- `domain` 定义用户上下文、对话消息、模型配置和工具契约。`Tool` 包含名称、描述、参数 Schema 以及 `execute(input, context)`。对话消息是判别联合：`system` / `user` / `assistant`（可带 `toolCalls`）/ `tool`（带 `toolCallId`）。
- `application` 负责智能体循环：把历史和本轮消息连同工具定义交给模型，模型请求工具时执行并回填，直到模型给出最终文本。`AgentLoop` 组织循环（默认最多 8 轮），`AgentRunner` 通过模型工厂为每次调用创建模型。
- `adapter` 实现厂商 API、内存历史存储和具体工具。OpenAI / Anthropic 适配器会把工具定义注入请求，并把模型返回的工具调用解析成统一的 `ToolCall`。
- `create-agent.ts` 组装适配器和应用层，提供 `createAgent(context, modelConfig, tools)`。
- `index.ts` 只作为包入口，导出公共 API 和类型。
- `cli.ts` 是命令行启动入口。

## 使用

要求 Node.js 22 或更高版本。

### 创建 Agent

```ts
import { createAgent, InMemoryContext, type ModelConfig } from "myagent";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("请设置 OPENAI_API_KEY 环境变量。");

const context = new InMemoryContext([
  { role: "system", content: "你是一个简洁、友好的中文智能体。" },
]);

const modelConfig: ModelConfig = {
  provider: "openai",
  name: "gpt-4o-mini",
  apiKey,
  baseURL: "https://api.openai.com/v1",
};
const agent = createAgent(context, modelConfig);
const answer = await agent.complete("你好");
```

`createAgent` 的第三个参数是可选的工具数组，默认为空。

### 工具

工具让**模型**决定是否调用（原生 tool call）：`AgentLoop` 把工具定义连同消息发给模型，模型返回 `toolCalls` 时执行对应工具、把结果作为 `tool` 消息回填，然后再次请求模型，直到模型不再请求工具。适配层已提供一个可直接使用的 `ClockTool`：

```ts
import { ClockTool, createAgent } from "myagent";

const agentWithTools = createAgent(context, modelConfig, [new ClockTool()]);
```

自定义工具推荐继承 `AbstractAgentTool`，只需提供元数据并实现 `execute`：

```ts
import { AbstractAgentTool } from "myagent";

interface WeatherInput {
  city: string;
}

class WeatherTool extends AbstractAgentTool<WeatherInput> {
  readonly name = "weather";
  readonly description = "查询城市天气";
  readonly inputSchema: Readonly<Record<string, unknown>> = {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  };

  async execute(input: WeatherInput): Promise<string> {
    return `${input.city}：晴`;
  }
}

const agentWithWeather = createAgent(context, modelConfig, [new WeatherTool()]);
```

`execute` 收到的第一个参数是模型按 `inputSchema` 生成的参数（`AbstractAgentTool<TInput>` 中会收缩为 `TInput`），第二个参数是当前的 `AgentContext`；返回的字符串会作为该次工具调用的结果写回本轮。未知工具名或执行抛错都会记录为一条错误结果，交给模型继续处理；超过最大轮数（默认 8）则报错。

`Tool` 是工具契约：`execute(input, context)` 依赖当前 `AgentContext`。`AbstractAgentTool<TInput>` 是可选的基类，用 `TInput` 描述 `execute` 的入参类型并约束元数据；不继承它也可以直接以对象实现 `Tool`：

```ts
import type { Tool } from "myagent";

const clock: Tool = {
  name: "clock",
  description: "返回当前时间",
  inputSchema: { type: "object", properties: {} },
  async execute(input, context) {
    return `现在是 ${new Date().toISOString()}`;
  },
};

const agent = createAgent(context, modelConfig, [clock]);
```

`ModelConfig.provider` 只接受 `"openai"` 和 `"anthropic"`。两者均使用 `name`、`apiKey`、`baseURL`，也可传入 `maxTokens` 和 `temperature`。OpenAI 兼容服务的地址通常包含 `/v1`。Anthropic 适配器会拼接 `/v1/messages`，其 `baseURL` 可以是 `https://api.anthropic.com`。如果使用 `.env` 文件，可由调用方加载，例如 `node --env-file=.env app.js`。

### 自定义上下文

实现 `AgentContext`，或者继承 `InMemoryContext`。`InMemoryContext` 默认原样返回本轮消息，子类可以覆盖 `prepareMessages()`。比如传入项目名称，让每轮请求都带上项目说明。

```ts
import { InMemoryContext, type ChatMessage } from "myagent";

class ProjectContext extends InMemoryContext {
  constructor(readonly projectName: string) {
    super();
  }

  override prepareMessages(messages: readonly ChatMessage[]): readonly ChatMessage[] {
    return [
      { role: "system", content: `当前项目为 ${this.projectName}。` },
      ...messages,
    ];
  }
}

const projectContext = new ProjectContext("myAgent");
```

- `getMessages()` 读取已保存的历史，可以同步或异步返回。
- 可选的 `prepareMessages()` 在进入循环前收到历史与本轮用户消息，用于构建首轮发给模型的消息；后续工具往返不会重复调用。它可以读取或更新上下文里的自定义数据，同步或异步返回。
- `addMessages()` 在整轮成功后一次性保存本轮用户消息、工具调用/结果和模型回复。自定义存储应将一轮的消息一起提交。准备阶段加入的临时消息只用于当前请求。

同一个 Agent 的 `complete()` 按调用顺序执行。每段独立对话请传入独立的上下文实例。`InMemoryContext` 的历史会在上下文实例存续期间保留。

## 命令行运行

命令行入口会自动加载项目根目录的 `.env`，并从中读取模型配置：

```dotenv
MODEL_PROVIDER=openai
OPENAI_API_KEY=你的 API Key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

使用 Anthropic 时设置 `MODEL_PROVIDER=anthropic`，并提供 `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL` 和 `ANTHROPIC_BASE_URL`。

开发模式下直接运行：

```sh
npm run dev
```

生产构建后运行：

```sh
npm start
```

`npm start` 会先自动执行构建。没有参数时进入交互模式，输入 `exit` 或 `quit` 退出；也可以只调用一次：

```sh
npm start -- "你好"
```

## 构建

```sh
npm run typecheck
npm run build
```
