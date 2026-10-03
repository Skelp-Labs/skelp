import path from 'path'
import fs from 'fs/promises'
import readline from 'readline/promises'
import { createAgentLoop } from '../agentloop/src/index.js'
import { createOllamaClient } from '../llm/ollama-client.js'
import { createResponseRenderer, createToolRenderer } from '../markdown/render-response.js'
import { createChatLog } from '../skelp/chat-log.js'
import registerFsTools from '../skills/filesystem/tools.js'
import registerTerminalTools from '../skills/terminal/tools.js'
import { DEFAULT_MAX_STEPS } from '../agentloop/src/loop.js'
import { printConfig, readOptionalFile } from './utils.js'

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

export const SEPARATOR = '----------------------------------------'

const soulDirectory = path.resolve(new URL('../souls/', import.meta.url).pathname)

async function readSoul (soul = 'standard') {
  const soulPath = path.isAbsolute(soul)
    ? soul
    : path.join(soulDirectory, `${soul}.md`)
  try {
    return await fs.readFile(soulPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Soul not found: ${soul}. Use a built-in soul name or an absolute Markdown path.`)
    }
    throw error
  }
}

export async function runChat (options = {}) {
  const {
    prompt = '',
    config,
    cwd = process.cwd(),
    executionMode = 'interactive',
    input = process.stdin,
    output = process.stdout,
    runCommand
  } = options
  const soul = await readSoul(config.soul)
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

  printConfig({
    ...config,
    executionMode,
    autoApprove
  })

  const agent = createAgentLoop({
    client,
    tools,
    maxSteps: config.maxSteps,
    systemPrompt: [
      config.tone,
      soul,
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

    const wakeup = await readOptionalFile(config.wakeup, 'Wakeup file')
    if (wakeup) await execute(wakeup)
    if (executionMode === 'autopilot') return execute(prompt)
    if (prompt.trim()) await execute(prompt)

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
