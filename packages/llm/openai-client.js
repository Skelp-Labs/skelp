/**
 * Low-level OpenAI-compatible API client.
 * Handles HTTP requests, streaming completions, and fetching models.
 */
function getServerUrl(server, endpoint) {
  return `${server.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

export async function readStreamingResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';
  const toolCalls = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine === 'data: [DONE]') continue;
      if (!cleanLine.startsWith('data: ')) continue;

      try {
        const jsonDoc = JSON.parse(cleanLine.slice(6));
        const delta = jsonDoc.choices?.[0]?.delta;
        if (!delta) continue;

        const chunk = delta.content || '';
        if (chunk) fullReply += chunk;
        onChunk?.(delta);

        for (const toolCall of delta.tool_calls || []) {
          const index = toolCall.index ?? 0;
          if (!toolCalls[index]) {
            toolCalls[index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
          }
          if (toolCall.id) toolCalls[index].id = toolCall.id;
          if (toolCall.function?.name) toolCalls[index].function.name += toolCall.function.name;
          if (toolCall.function?.arguments) toolCalls[index].function.arguments += toolCall.function.arguments;
        }
      } catch (error) {
        // Ignore incomplete JSON chunks.
      }
    }
  }

  return { content: fullReply, toolCalls: toolCalls.filter(Boolean) };
}

export function createOpenAIClient(config = {}) {
  const client = {
    server: config.server || 'http://localhost:1234',
    primaryModel: config.primaryModel || 'local-ai-model',
    reasoningEffort: config.reasoningEffort || 'none',
    maxTokens: Number.isInteger(config.maxTokens) ? config.maxTokens : 8192
  };

  client.updateConfig = (nextConfig = {}) => {
    Object.assign(client, nextConfig);
  };

  /**
   * Fetches the list of available models from the OpenAI-compatible server.
   */
  client.getModels = async () => {
    try {
      const url = getServerUrl(client.server, '/v1/models');
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        return data.data.map((m) => m.id);
      }
      return [];
    } catch (err) {
      throw new Error(`Failed to fetch models from ${client.server}: ${err.message}`);
    }
  }

  /**
   * Streams chat completions from OpenAI-compatible endpoint.
   * Calls onChunk with the raw delta object (containing content, reasoning_content, tool_calls, etc.).
   * Returns { content: string, toolCalls: Array }.
   */
  client.chatCompletionStream = async ({ messages, tools, toolChoice = 'auto', onChunk, signal, requestPayload = {} }) => {
    const url = getServerUrl(client.server, '/v1/chat/completions');
    const payload = {
      ...requestPayload,
      model: client.primaryModel,
      messages,
      stream: true,
      temperature: requestPayload.temperature ?? 0
    };

    payload.reasoning_effort = client.reasoningEffort;
    payload.max_tokens = client.maxTokens;

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = toolChoice;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${bodyText || response.statusText}`);
    }

    return readStreamingResponse(response, onChunk);
  };

  return client;
}

