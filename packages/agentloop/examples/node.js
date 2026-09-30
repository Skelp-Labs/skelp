import { createAgentLoop } from '../src/index.js';
import { createOpenAIClient } from './openai-client/openai-client.js';

const client = createOpenAIClient({
  baseUrl: process.env.AGENT_BASE_URL || 'http://localhost:1234/v1',
  model: process.env.AGENT_MODEL || 'local-model',
  apiKey: process.env.AGENT_API_KEY || 'lm-studio'
});

const agent = createAgentLoop({
  client,
  systemPrompt: 'You are a concise assistant. Use tools when they help.',
  tools: [{
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Get the current local time.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    },
    handler: async () => new Date().toLocaleTimeString()
  }]
});

await agent.run(process.argv.slice(2).join(' ') || 'What time is it?', {
  onText: (text) => process.stdout.write(text),
  onToolCall: ({ name, args }) => console.error(`\n[tool] ${name} ${JSON.stringify(args)}`),
  onToolResult: ({ result }) => console.error(`[result] ${result}`),
  onComplete: () => process.stdout.write('\n')
});