export interface GenerateOpts {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMProvider {
  /** Returns true once the model/session is ready to accept prompts. */
  isReady(): boolean;
  /** Streams tokens as an async iterable. Yields one string per token. */
  generate(prompt: string | { role: string; content: string }[], opts?: GenerateOpts): AsyncIterable<string>;
  /** Frees resources associated with the model. */
  unload?(): Promise<void>;
}
