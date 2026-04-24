import {
  insertMemory,
  updateMemory,
  deleteMemory,
  searchMemoriesFTS,
  getMemories,
  getAllMemories,
  clearMemories,
} from '@/storage/MemoryRepository';

// ── Write: dedup-aware save ───────────────────────────────────────────────────

/**
 * Saves a fact to the memory pool.
 *
 * Dedup strategy (FTS5-based):
 *  1. Search existing facts for the new fact text.
 *  2. If a similar fact is found → update it in-place (newer = more specific/accurate).
 *  3. If no match → insert as new.
 *
 * This prevents semantic duplicates like:
 *  "Dre likes coffee" + "Dre enjoys coffee" → kept as one updated fact.
 */
export async function saveFactToMemory(fact: string): Promise<string> {
  if (!fact?.trim()) {
    return 'Memory failed: Fact cannot be empty.';
  }

  const cleaned = fact.trim();

  try {
    // Search for a semantically similar existing fact
    const similar = await searchMemoriesFTS(cleaned, 1);

    if (similar.length > 0) {
      // Found a match — update in place rather than duplicating
      const existing = similar[0];
      if (existing.fact === cleaned) {
        return `Memory already known: "${cleaned}"`;
      }
      await updateMemory(existing.id, cleaned);
      return `Memory updated: "${existing.fact}" → "${cleaned}"`;
    }

    // No similar fact — insert as new
    await insertMemory(cleaned);
    return `Memory saved: "${cleaned}"`;
  } catch (error) {
    console.error('Failed to save memory:', error);
    return 'Memory failed: Database error.';
  }
}

// ── Read: relevance-blended fetch ─────────────────────────────────────────────

/**
 * Fetches memories for injection into the system prompt.
 *
 * Blending strategy:
 *  - If a `query` is provided (the user's current message): run FTS5 to get
 *    the most relevant facts, then pad with recent facts up to `limit`.
 *  - Without a query: fall back to pure recency (latest N facts).
 *
 * The blend ensures the model always sees both contextually relevant facts
 * AND recently saved ones (which may not yet be indexed prominently).
 */
export async function fetchMemoriesForContext(
  limit: number,
  query?: string,
): Promise<string> {
  try {
    let facts: { id: number; fact: string }[] = [];

    if (query?.trim()) {
      const half = Math.ceil(limit / 2);

      // Top half: FTS5 relevance match against current user message
      const relevant = await searchMemoriesFTS(query, half);

      // Bottom half: most recent facts not already in the relevant set
      const relevantIds = new Set(relevant.map((m) => m.id));
      const recent = await getMemories(limit);
      const fresh = recent.filter((m) => !relevantIds.has(m.id)).slice(0, limit - relevant.length);

      facts = [...relevant, ...fresh];
    } else {
      facts = await getMemories(limit);
    }

    if (facts.length === 0) return '';

    const formatted = facts.map((m) => `- ${m.fact}`).join('\n');
    return `\n## Memory Pool (Facts about Dre)\n${formatted}\n`;
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return '';
  }
}

// ── Management helpers (for cleanup UI) ──────────────────────────────────────

export async function getAllFacts() {
  return getAllMemories();
}

export async function deleteFact(id: number): Promise<void> {
  await deleteMemory(id);
}

export async function clearAllFacts(): Promise<void> {
  await clearMemories();
}
