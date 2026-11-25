import "dotenv/config";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { ClockTool, createAgent, InMemoryContext, type ModelConfig } from "./index";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`请设置 ${name} 环境变量。`);
  }

  return value;
}

function loadModelConfigFromEnv(): ModelConfig {
  const provider = (process.env.MODEL_PROVIDER ?? "openai").toLowerCase();

  switch (provider) {
    case "openai":
      return {
        provider,
        name: requiredEnvironment("OPENAI_MODEL"),
        apiKey: requiredEnvironment("OPENAI_API_KEY"),
        baseURL:
          process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      };
    case "anthropic":
      return {
        provider,
        name: requiredEnvironment("ANTHROPIC_MODEL"),
        apiKey: requiredEnvironment("ANTHROPIC_API_KEY"),
        baseURL: requiredEnvironment("ANTHROPIC_BASE_URL"),
        maxTokens: 1024,
      };
    default:
      throw new Error(
        `不支持的 MODEL_PROVIDER: ${provider}，可选值为 openai 或 anthropic。`,
      );
  }
}

async function main(): Promise<void> {
  const agent = createAgent(
    new InMemoryContext([
      { role: "system", content: "你是一个简洁、友好的中文智能体。" },
    ]),
    loadModelConfigFromEnv(),
    [new ClockTool()],
  );

  const printAnswer = async (input: string): Promise<void> => {
    for await (const delta of agent.stream(input)) {
      stdout.write(delta);
    }
    stdout.write("\n");
  };

  const question = process.argv.slice(2).join(" ").trim();
  if (question) {
    await printAnswer(question);
    return;
  }

  const readline = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const input = (await readline.question("你: ")).trim();
      if (["exit", "quit"].includes(input.toLowerCase())) {
        break;
      }
      if (!input) {
        continue;
      }

      try {
        stdout.write("智能体: ");
        await printAnswer(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`调用模型失败: ${message}`);
      }
    }
  } finally {
    readline.close();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`启动失败: ${message}`);
  process.exitCode = 1;
});
