/**
 * SearchService — Enables fetching and parsing live web search results.
 * Uses DuckDuckGo HTML endpoint as a lightweight, API-key-free backend.
 */

import * as Network from 'expo-network';

export async function performWebSearch(query: string): Promise<string> {
  console.log(`[SearchService] Executing Tavily search for: "${query}"`);
  
  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) {
      return `Search failed: Device is completely offline. You have no internet connection to perform this search. Inform Dre gracefully.`;
    }
  } catch (e) {
    // Keep going if network check fails for permission reasons
  }

  const apiKey = process.env.EXPO_PUBLIC_TAVILY_API_KEY;
  
  if (!apiKey) {
    return 'Search failed: EXPO_PUBLIC_TAVILY_API_KEY is not set in the .env file.';
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 3,
      }),
    });

    if (response.status === 429) {
      return `Search failed: Tavily API rate limit reached. Tell Dre that you've hit the search limit for now and to try again in a little while.`;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    let resultString = '';
    
    // Tavily often provides a direct, highly accurate LLM-generated answer.
    if (data.answer) {
      resultString += `--- Direct Answer ---\n${data.answer}\n\n`;
    }
    
    // Also include the top source snippets for additional context
    if (data.results && data.results.length > 0) {
      resultString += `--- Source Summaries ---\n`;
      data.results.forEach((res: any) => {
        resultString += `- ${res.content}\n`;
      });
    }

    if (!resultString) {
      return `Search failed or no results found for: "${query}"`;
    }

    return `Search Results for "${query}":\n${resultString}`;
  } catch (error: any) {
    console.error('[SearchService] Error:', error);
    return `Search failed: ${error.message}`;
  }
}
