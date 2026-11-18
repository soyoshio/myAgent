import "dotenv/config";
import { InMemoryContext } from "./adapter/context/in-memory-context";
import { ReadlineChatIO } from "./adapter/cli/readline-chat-io";
import { createChatModel } from "./adapter/models/create-chat-model";
import { ChatLoop } from "./application/chat-loop";

async function main(): Promise<void> {
  const io = new ReadlineChatIO();

  try {
    const model = createChatModel();
    const context = new InMemoryContext([
      {
        role: "system",
        content: "你是一个简洁、友好的中文智能体。",
      },
    ]);

    await new ChatLoop(model, context, io, io).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`启动失败: ${message}`);
    process.exitCode = 1;
  } finally {
    io.close();
  }
}

void main();
