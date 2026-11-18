# myAgent

一个使用 TypeScript 编写的简单命令行智能体，按领域层、应用层和适配层组织代码，支持 OpenAI 与 Anthropic。

## 目录结构

```text
src/
├── domain/
│   └── context.ts                  # 消息与聊天上下文接口
├── application/
│   ├── chat-loop.ts                # 输入、调用模型、保存回答的聊天循环
│   └── ports/
│       ├── chat-model.ts           # 应用层模型接口
│       └── chat-io.ts              # 应用层输入输出接口
├── adapter/
│   ├── cli/
│   │   └── readline-chat-io.ts     # 终端输入输出实现
│   ├── context/
│   │   └── in-memory-context.ts    # 内存上下文实现
│   └── models/
│       ├── openai-model.ts         # OpenAI API
│       ├── anthropic-model.ts      # Anthropic API
│       └── create-chat-model.ts    # 根据环境变量选择厂商
└── index.ts                        # 依赖组装与程序入口
```

- `domain`：只包含核心概念，不依赖外部技术。
- `application`：实现内部业务流程，通过接口依赖模型和输入输出。
- `adapter`：实现外部 API、终端和存储等技术细节。
- `index.ts`：组合各层实现，业务层不直接依赖具体厂商。

## 运行

要求 Node.js 22 或更高版本。

### 配置环境变量

程序启动时会自动读取根目录的 `.env`。项目已提供 `.env` 和 `.env.example`，在 `.env` 中填写自己的 API Key 即可；该文件已被 Git 忽略，不要提交真实密钥。

使用 OpenAI：

```dotenv
MODEL_PROVIDER=openai
OPENAI_API_KEY=你的 API Key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

`OPENAI_BASE_URL` 用于设置 OpenAI 或兼容服务的 API 基础地址。使用代理或兼容服务时，将其设置为对应服务的基础地址，通常需要包含 `/v1`。

使用 Anthropic：

```dotenv
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=你的 API Key
ANTHROPIC_MODEL=claude-3-5-haiku-latest
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

`ANTHROPIC_BASE_URL` 用于设置 Anthropic 或兼容服务的 API 基础地址。适配器会自动拼接 `/v1/messages`，因此这里只需填写基础地址，不要重复添加接口路径，末尾也不要带 `/`。

配置完成后启动：

```sh
npm run dev
```

启动后输入消息即可聊天，输入 `exit` 或 `quit` 退出。当前上下文只保存在内存中，程序退出后对话记录会清除。

## 构建

```sh
npm run typecheck
npm run build
npm start
```
