 # LLM Client

The client sends streaming requests to an OpenAI-compatible `/v1/chat/completions` endpoint.

## Main Options

- `max_tokens`: Maximum number of tokens the model can generate. Higher values allow longer responses. Default: `8192`.
- `reasoning_effort`: Controls how much reasoning the model uses. The default is `"none"`; supported values depend on the model, commonly `"low"`, `"medium"`, and `"high"`.
- `temperature`: Controls randomness. `0` is more deterministic; higher values produce more varied responses. Default: `0`.
- `model`: The model identifier, configured as `primaryModel`.
- `messages`: The conversation history sent to the model.
- `stream`: Always enabled by this client, so output is received incrementally.

## Optional Options

- `tools`: Function definitions the model can call.
- `tool_choice`: Controls tool use, for example `"auto"`.
- `top_p`: An alternative way to control randomness by limiting the token probability range. It can be passed through `requestPayload`.

## Configuration Example

```js
const client = createOpenAIClient({
	server: 'http://localhost:1234',
	primaryModel: 'my-model',
	reasoningEffort: 'medium',
	maxTokens: 4096
})

await client.chatCompletionStream({
	messages,
	requestPayload: {
		temperature: 0.2,
		top_p: 0.9
	},
	onChunk: (delta) => {
		process.stdout.write(delta.content || '')
	}
})
```

`reasoningEffort` and `maxTokens` are client configuration values. They are sent as `reasoning_effort` and `max_tokens`, and override values with those names in `requestPayload`.

## Ollama

For a native Ollama server, import `createOllamaClient` from `../ollama-client.js`.

```js
const client = createOllamaClient({
	server: 'http://localhost:11434',
	primaryModel: 'gemma4:26b',
	maxTokens: 4096,
	think: false
})

await client.chatCompletionStream({
	messages: [{ role: 'user', content: 'How does cat work?' }],
	onChunk: (chunk) => process.stdout.write(chunk.response || '')
})
```

The Ollama client uses `/api/generate`, reads newline-delimited JSON, and returns `{ content }`. `getModels()` uses `/api/tags`.
