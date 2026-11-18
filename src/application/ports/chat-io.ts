export interface ChatInput {
  read(): Promise<string | null>;
}

export interface ChatOutput {
  write(message: string): void;
}
