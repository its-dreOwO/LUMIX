export interface GenerateOpts {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;     // used by Lumen/cloud providers
  dynamicContext?: string;   // used by local provider — date + memory, prepended per turn
}

export interface LLMProvider {
  /** Returns true once the model/session is ready to accept prompts. */
  isReady(): boolean;
  /** Streams tokens as an async iterable. Yields one string per token. */
  generate(prompt: string | { role: string; content: string }[], opts?: GenerateOpts): AsyncIterable<string>;
  /** Frees resources associated with the model. */
  unload?(): Promise<void>;
  /** Resets the conversation state (e.g. on new session) without unloading the model. */
  resetConversation?(): void;
}
