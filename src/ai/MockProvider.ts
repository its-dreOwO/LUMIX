import type { LLMProvider, GenerateOpts } from './LLMProvider';

const MOCK_REPLIES = [
  "Hey — I'm LUMIX. Still warming up the real model, but I'm here. What's on your mind?",
  'Systems nominal. Particle field is live. Ask me anything.',
  'Running on mock mode right now. Gemma will take over once the model loads.',
  'I can hear you. Give me a moment to get the neurons firing.',
];

let idx = 0;

export class MockProvider implements LLMProvider {
  isReady() {
    return true;
  }

  async *generate(prompt: string, _opts?: GenerateOpts): AsyncIterable<string> {
    const reply = MOCK_REPLIES[idx % MOCK_REPLIES.length];
    idx++;

    for (const word of reply.split(' ')) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 60));
    }
  }
}
