/**
 * Low-level Ollama API client.
 * Handles chat prompts, streaming responses, and fetching models.
 */
function getServerUrl (server, endpoint) {
  return `${server.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
}

function normalizeMessages (messages = []) {
  return messages.map((message) => {
    if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
      return {
        ...message,
        tool_calls: message.tool_calls.map((toolCall) => ({
          function: {
            name: toolCall.function?.name || '',
            arguments: typeof toolCall.function?.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments || '{}')
              : toolCall.function?.arguments || {}
          }
        }))
      }
    }

    if (message.role === 'tool') {
      const { tool_call_id, ...ollamaMessage } = message
      return ollamaMessage
    }

    return message
  })
}

export async function readOllamaStreamingResponse (response, onChunk) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullReply = ''
  const toolCalls = []

  const consumeLine = (line) => {
    const cleanLine = line.trim()
    if (!cleanLine) return

    try {
      const jsonDoc = JSON.parse(cleanLine)
      const message = jsonDoc.message || {}
      const chunk = message.content || jsonDoc.response || ''
      if (chunk) fullReply += chunk
      const delta = {
        ...message,
        content: chunk,
        reasoning: message.thinking || message.reasoning
      }
      if (Array.isArray(message.tool_calls)) {
        delta.tool_calls = message.tool_calls.map((toolCall, index) => {
          const normalized = {
            index,
            id: toolCall.id || `${jsonDoc.created_at || 'ollama'}-${index}`,
            type: 'function',
            function: {
              name: toolCall.function?.name || toolCall.name || '',
              arguments: typeof toolCall.function?.arguments === 'string'
                ? toolCall.function.arguments
                : JSON.stringify(toolCall.function?.arguments ?? toolCall.arguments ?? {})
            }
          }
          toolCalls[index] = {
            id: normalized.id,
            type: normalized.type,
            function: { ...normalized.function }
          }
          return normalized
        })
      }
      onChunk?.(delta)
    } catch (error) {
      // Ignore incomplete JSON lines.
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    lines.forEach(consumeLine)
  }

  buffer += decoder.decode()
  consumeLine(buffer)

  return { content: fullReply, toolCalls: toolCalls.filter(Boolean) }
}

export function createOllamaClient (config = {}) {
  const client = {
    server: config.server || 'http://localhost:11434',
    primaryModel: config.primaryModel || 'llama3.2',
    maxTokens: Number.isInteger(config.maxTokens) ? config.maxTokens : 8192,
    think: config.think ?? false
  }

  client.updateConfig = (nextConfig = {}) => {
    Object.assign(client, nextConfig)
  }

  client.getModels = async () => {
    try {
      const url = getServerUrl(client.server, '/api/tags')
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error(`Server returned status ${response.status}`)

      const data = await response.json()
      return Array.isArray(data.models) ? data.models.map((model) => model.name) : []
    } catch (error) {
      throw new Error(`Failed to fetch models from ${client.server}: ${error.message}`)
    }
  }

  client.chatCompletionStream = async ({ messages, tools, onChunk, signal, requestPayload = {} }) => {
    const url = getServerUrl(client.server, '/api/chat')
    const payload = {
      ...requestPayload,
      model: client.primaryModel,
      messages: normalizeMessages(messages),
      stream: true,
      think: requestPayload.think ?? client.think,
      options: {
        ...(requestPayload.options || {}),
        num_predict: requestPayload.options?.num_predict ?? client.maxTokens
      }
    }

    if (tools?.length) payload.tools = tools

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${bodyText || response.statusText}`)
    }

    return readOllamaStreamingResponse(response, onChunk)
  }

  return client
}