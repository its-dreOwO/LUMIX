import { insertMemory, getMemories, clearMemories } from '@/storage/MemoryRepository';

export async function saveFactToMemory(fact: string): Promise<string> {
  if (!fact || !fact.trim()) {
    return 'Memory failed: Fact cannot be empty.';
  }
  
  try {
    await insertMemory(fact.trim());
    return `Memory saved successfully: "${fact}"`;
  } catch (error) {
    console.error('Failed to save memory:', error);
    return 'Memory failed: Database error.';
  }
}

export async function fetchMemoriesForContext(limit: number): Promise<string> {
  try {
    const memories = await getMemories(limit);
    if (memories.length === 0) return '';
    
    // Format into a bulleted list of facts
    const formatted = memories.map((m) => `- ${m.fact}`).join('\n');
    return `\n## Memory Pool (Facts about Dre)\n${formatted}\n`;
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return '';
  }
}
