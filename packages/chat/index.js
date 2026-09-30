import path from 'path'
import readline from 'readline/promises'
import { createAgentLoop } from '../agentloop/src/index.js'
import { createOllamaClient } from '../llm/ollama-client.js'
import { createResponseRenderer, createToolRenderer } from '../markdown/render-response.js'
import { createChatLog } from '../skelp/chat-log.js'
import registerFsTools from '../skills/filesystem/tools.js'
import registerTerminalTools from '../skills/terminal/tools.js'

function createInterface (input, output) {
  return readline.createInterface({ input, output })
}

function createConfirmationHandler (rl, state) {
  return async (command) => {
    if (state.allowAll) return true
    const answer = (await rl.question(`Allow '${command}'? [Y/n/a] `)).trim().toLowerCase()
    if (answer === 'a') {
      state.allowAll = true
      return true
    }
    return answer === '' || answer === 'y' || answer === 'yes'
  }
}

export async function runChat ({ prompt = '', config, cwd, executionMode = 'interactive', input = process.stdin, output = process.stdout, runCommand }) {
  const client = createOllamaClient(config)
  const rl = createInterface(input, output)
  const confirmationState = { allowAll: false }
  const tools = [
    ...registerFsTools({ cwd, readlineInterface: rl }),
    ...registerTerminalTools({
      cwd,
      workspaceRoot: cwd,
      readlineInterface: rl,
      autoApprove: executionMode === 'autopilot' || config.autoApprove,
      askForConfirmation: createConfirmationHandler(rl, confirmationState),
      runCommand
    })
  ]

  const autoApprove = executionMode === 'autopilot' || config.autoApprove
  console.log('----------------------------------------')
  console.log(`\x1b[36mExecution mode:\x1b[0m ${executionMode}`)
  console.log(`\x1b[36mServer:\x1b[0m ${config.server}`)
  console.log(`\x1b[36mPrimary model:\x1b[0m ${config.primaryModel}`)
  console.log(`\x1b[36mAuto approve:\x1b[0m ${autoApprove}`)
  console.log('----------------------------------------')

  const agent = createAgentLoop({
    client,
    tools,
    systemPrompt: [
      config.tone,
      config.userSystem,
      executionMode === 'autopilot'
        ? 'Execution mode: autopilot. Execute the requested plan without asking for confirmation.'
        : 'Execution mode: interactive. Ask before taking consequential actions.'
    ].filter(Boolean).join('\n')
  })
  try {
    const execute = async (instruction) => {
      const renderer = createResponseRenderer()
      const toolRenderer = createToolRenderer()
      const chatLog = createChatLog({ prompt: instruction, config })
      try {
        const result = await agent.run([{ role: 'user', content: instruction }], {
          onToolCall: (toolCall) => {
            toolRenderer.onToolCall(toolCall)
            return chatLog.writeToolCall({ ...toolCall, messages: agent.messages })
          },
          onToolResult: toolRenderer.onToolResult,
          onStatus: toolRenderer.onStatus,
          onStep: (step) => chatLog.writeStep(step),
          onDelta: (delta) => renderer.writeDelta(delta)
        })
        renderer.end()
        await chatLog.write(agent.messages, result)
        return result
      } catch (error) {
        await chatLog.write(agent.messages, null, error)
        throw error
      }
    }

    if (executionMode === 'autopilot') return execute(prompt)

    console.log('Please provide your instructions or the task you wish me to perform.')
    while (true) {
      let instruction
      try {
        instruction = (await rl.question('\n> ')).trim()
      } catch {
        break
      }
      if (!instruction) continue
      if (instruction === 'exit' || instruction === 'quit') break
      await execute(instruction)
    }
  } finally {
    rl.close()
  }
}

export { createConfirmationHandler }
