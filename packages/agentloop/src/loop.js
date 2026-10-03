export const DEFAULT_MAX_STEPS = 8

export function createAgentLoop (options = {}) {
  const client = options.client
  if (!client?.chatCompletionStream) throw new Error('A completion client is required')

  let systemPrompt = options.systemPrompt || ''
  let tools = options.tools || []
  const messages = options.messages || options.history || []
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS
  const clearHistory = () => {
    messages.length = 0
  }
  const throwIfAborted = (signal) => {
    if (!signal?.aborted) return
    throw signal.reason || new DOMException('The operation was aborted.', 'AbortError')
  }

  return {
    messages,
    get chatHistory () {
      return messages
    },

    getTools () {
      return tools
    },

    setTools (nextTools) {
      tools = nextTools || []
    },

    setSystemPrompt (prompt) {
      systemPrompt = prompt || ''
    },

    clear: clearHistory,
    clearHistory,

    async executeGoal (prompt, onStream, execOptions = {}) {
      const eventCallbacks = {
        ...execOptions,
        onDelta: onStream
      }
      return this.run([{ role: 'user', content: prompt }], {
        ...eventCallbacks
      }, execOptions)
    },

    async run (inputMessages = [], events = {}, runOptions = {}) {
      if (!Array.isArray(inputMessages)) throw new Error('Messages must be an array')

      const activeTools = runOptions.tools || tools
      const toolSchemas = activeTools.map(({ handler, onChunk, skillName, aliases, ...schema }) => schema)
      const handlers = new Map()
      for (const tool of activeTools) {
        const name = tool.function.name
        handlers.set(name, tool.handler)
        if (!tool.skillName) continue
        handlers.set(`${tool.skillName}:${name}`, tool.handler)
        for (const alias of tool.aliases || []) {
          handlers.set(`${tool.skillName}:${alias}`, tool.handler)
        }
      }
      messages.push(...inputMessages)
      if (systemPrompt) {
        if (messages[0]?.role === 'system') messages[0] = { ...messages[0], content: systemPrompt }
        else messages.unshift({ role: 'system', content: systemPrompt })
      }
      for (let step = 0; step < (runOptions.maxSteps ?? maxSteps); step += 1) {
        throwIfAborted(runOptions.signal)
        const limit = runOptions.maxSteps ?? maxSteps
        await events.onBeforeStep?.({ step, messages: messages.slice(), remaining: limit - step })
        const shouldContinue = await events.onStep?.({ step, messages: messages.slice(), remaining: limit - step })
        if (shouldContinue === false) {
          const stopped = { content: '', toolCalls: [], stopped: true, reason: 'guardrail' }
          events.onStop?.({ step, reason: 'guardrail' })
          return stopped
        }
        const calls = {}
        const request = {
          messages,
          tools: toolSchemas.length ? toolSchemas : undefined,
          toolChoice: toolSchemas.length ? 'auto' : undefined,
          signal: runOptions.signal,
          onRequest: (payload) => {
            events.onRequest?.({ step, payload })
          },
          onChunk: (delta) => {
            events.onDelta?.(delta)
            if (delta.content) events.onText?.(delta.content)
            const reasoning = delta.reasoning_content || delta.reasoning
            if (reasoning) events.onReasoning?.(reasoning)
            for (const chunk of delta.tool_calls || []) {
              const index = chunk.index ?? 0
              calls[index] ||= { id: '', name: '', arguments: '', key: `${step}:${index}` }
              const call = calls[index]
              if (chunk.id) call.id = chunk.id
              if (chunk.function?.name) call.name += chunk.function.name
              if (chunk.function?.arguments) call.arguments += chunk.function.arguments
              events.onToolCallDelta?.({ ...call, step, index, argsSoFar: call.arguments })
              events.onStatus?.(`Tool: ${call.name}...`)
            }
          }
        }
        const response = await client.chatCompletionStream(request)
        throwIfAborted(runOptions.signal)
        events.onResponse?.({ step, response })

        const assistant = { role: 'assistant', content: response.content || null }
        if (response.toolCalls?.length) assistant.tool_calls = response.toolCalls
        messages.push(assistant)
        if (!response.toolCalls?.length) {
          events.onComplete?.({ step, response })
          return response
        }

        const results = await Promise.all(response.toolCalls.map(async (toolCall, index) => {
          const key = `${step}:${index}`
          const name = toolCall.function.name
          let args
          let result
          let failed = false
          try {
            args = JSON.parse(toolCall.function.arguments || '{}')
            events.onToolCall?.({ key, step, index, id: toolCall.id, name, args })
            const handler = handlers.get(name)
            result = typeof handler === 'function'
              ? await handler(args)
              : await runOptions.onClientTool?.({ key, step, index, id: toolCall.id, name, args }) ?? `Unknown tool: ${name}`
          } catch (error) {
            result = `Tool execution error: ${error.message}`
            failed = true
          }
          const event = { key, step, index, id: toolCall.id, name, args, result, error: failed }
          events.onToolResult?.(event)
          const image = result && result.type === 'image' ? result : null
          return {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: image ? `Attached image: ${image.path}` : String(result),
            image
          }
        }))
        throwIfAborted(runOptions.signal)
        messages.push(...results)
        const images = results.map((result) => result.image).filter(Boolean)
        if (images.length) {
          messages.push({
            role: 'user',
            content: 'Attached image(s) are available for visual analysis.',
            images: images.map((image) => image.data)
          })
        }
      }

      throw new Error(`Agent stopped after ${runOptions.maxSteps ?? maxSteps} steps without a final response`)
    }
  }
}
