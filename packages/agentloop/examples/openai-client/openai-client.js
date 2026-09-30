export function createOpenAIClient(options = {}) {
  const baseUrl = (options.baseUrl || 'http://localhost:1234/v1').replace(/\/+$/, '');
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');

  return {
    async chatCompletionStream({ messages, tools, toolChoice, onChunk, signal }) {
      const body = { model: options.model || 'local-model', messages, stream: true };
      if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort;
      if (tools?.length) {
        body.tools = tools;
        body.tool_choice = toolChoice || 'auto';
      }
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}) },
        body: JSON.stringify(body),
        signal
      });
      if (!response.ok) throw new Error(`Completion API returned ${response.status}: ${await response.text()}`);
      if (!response.body) throw new Error('Completion API returned no stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      const toolCalls = [];
      const consume = (line) => {
        if (!line.startsWith('data: ') || line.slice(6) === '[DONE]') return;
        const payload = JSON.parse(line.slice(6));
        const delta = payload.choices?.[0]?.delta;
        if (!delta) return;
        if (delta.content) content += delta.content;
        onChunk?.(delta);
        for (const chunk of delta.tool_calls || []) {
          const index = chunk.index ?? 0;
          toolCalls[index] ||= { id: '', type: 'function', function: { name: '', arguments: '' } };
          if (chunk.id) toolCalls[index].id = chunk.id;
          if (chunk.function?.name) toolCalls[index].function.name += chunk.function.name;
          if (chunk.function?.arguments) toolCalls[index].function.arguments += chunk.function.arguments;
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(consume);
      }
      if (buffer.trim()) consume(buffer.trim());
      return { content, toolCalls: toolCalls.filter(Boolean) };
    }
  };
}