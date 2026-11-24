# myAgent

一个使用 TypeScript 编写的简单智能体库，按领域层、应用层和适配层组织代码，支持 OpenAI 与 Anthropic。

## 目录结构

```text
src/
├── domain/
│   ├── context.ts                  # 消息与历史读写接口
│   ├── agent.ts                    # 用户上下文与每轮准备接口
│   └── model.ts                    # 模型配置与厂商类型
├── application/
│   ├── agent.ts                    # Agent 入口，调用模型并保存历史
│   ├── agent-runner.ts             # 通过模型工厂执行调用
│   └── ports/
│       ├── agent-model-factory.ts  # 模型工厂接口
│       └── chat-model.ts           # 应用层模型接口
├── adapter/
│   ├── context/
│   │   └── in-memory-context.ts    # 内存上下文实现
│   └── models/
│       ├── openai-model.ts         # OpenAI API
│       ├── anthropic-model.ts      # Anthropic API
│       └── create-chat-model.ts    # 按厂商实例化模型
├── create-agent.ts                 # 组合适配器与应用层
├── cli.ts                          # 命令行入口
└── index.ts                        # 公共 API 导出
```

- `domain` 定义用户上下文、对话消息和模型信息。
- `application` 负责每轮的消息准备、模型调用和历史保存。`AgentRunner` 通过模型工厂为每次调用创建模型。
- `adapter` 实现厂商 API 和内存历史存储。模型适配器接收模型信息和准备好的消息。
- `create-agent.ts` 组装适配器和应用层，提供 `createAgent(context, modelInfo)`。
- `index.ts` 只作为包入口，导出公共 API 和类型。
- `cli.ts` 是命令行启动入口。

## 使用

要求 Node.js 22 或更高版本。

### 创建 Agent

```ts
import { createAgent, InMemoryContext } from "myagent";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("请设置 OPENAI_API_KEY 环境变量。");

const context = new InMemoryContext([
  { role: "system", content: "你是一个简洁、友好的中文智能体。" },
]);

const agent = createAgent(context, {
  provider: "openai",
  name: "gpt-4o-mini",
  apiKey,
  baseURL: "https://api.openai.com/v1",
});
const answer = await agent.complete("你好");
```

`ModelInfo.provider` 只接受 `"openai"` 和 `"anthropic"`。两者均使用 `name`、`apiKey`、`baseURL`，也可传入 `maxTokens` 和 `temperature`。OpenAI 兼容服务的地址通常包含 `/v1`。Anthropic 适配器会拼接 `/v1/messages`，其 `baseURL` 可以是 `https://api.anthropic.com`。如果使用 `.env` 文件，可由调用方加载，例如 `node --env-file=.env app.js`。

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
- 可选的 `prepareMessages()` 在每次模型调用前收到历史和本轮用户消息。它可以读取或更新上下文里的自定义数据，同步或异步返回本轮发给模型的消息。
- `addMessages()` 在模型成功后一次性保存本轮用户原始消息和模型回复。自定义存储应将一轮的消息一起提交。准备阶段加入的临时消息只用于当前请求。

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
