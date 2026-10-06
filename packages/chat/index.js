import path from 'path'
import fs from 'fs/promises'
import readline from 'readline/promises'
import { createAgentLoop } from '../agentloop/src/index.js'
import { createOllamaClient } from '../llm/ollama-client.js'
import { createResponseRenderer, createToolRenderer } from '../markdown/render-response.js'
import { createChatLog } from '../skelp/chat-log.js'
import registerFsTools from '../skills/filesystem/tools.js'
import registerTerminalTools from '../skills/terminal/tools.js'
import { printConfig, readOptionalFile } from './utils.js'
import { createCommandRegistry, createCompleter, runCommand as executeSlashCommand } from '../commands/index.js'
import { createConfigCommands } from '../config/commands.js'

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
    runCommand,
    saveConfig = async () => {},
    resetConfig = async () => {},
    setupConfig = async () => {}
  } = options
  const soul = await readSoul(config.soul)
  const client = createOllamaClient(config)
  const commands = createCommandRegistry([
    {
      name: 'help',
      description: 'Display available slash commands.',
      run: ({ output }) => {
        output.write(`${commands.list().map(command => `/${command.name} - ${command.description}`).join('\n')}\n`)
      }
    },
    {
      name: 'exit',
      description: 'Exit the chat.',
      run: () => ({ action: 'exit' })
    },
    {
      name: 'quit',
      description: 'Exit the chat.',
      run: () => ({ action: 'exit' })
    },
    {
      name: 'config',
      description: 'Manage Skelp configuration.',
      run: async ({ args, output }) => {
        const command = configCommands.find(command => command.name === args[0])
        if (!command) {
          output.write(`Available config commands: ${configCommands.map(command => command.name).join(', ')}\n`)
          return
        }
        return command.run({ args: args.slice(1), output })
      }
    }
  ])
  const configCommands = createConfigCommands({
    getConfig: async () => config,
    saveConfig: async (nextConfig) => {
      Object.assign(config, nextConfig)
      await saveConfig(config)
    },
    resetConfig: async () => {
      Object.assign(config, await resetConfig())
      await saveConfig(config)
    },
    setupConfig: async () => {
      const nextConfig = await setupConfig(config, { input, output })
      Object.assign(config, nextConfig)
      await saveConfig(config)
    }
  })
  const rl = readline.createInterface({
    input,
    output,
    completer: createCompleter(commands)
  })
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

  if (config.verbose) {
    printConfig({
      ...config,
      executionMode,
      autoApprove
    })
  }

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
    console.log('You can also use slash commands, such as /help or /exit. Type / and press Tab for autocomplete.')
    while (true) {
      let instruction
      try {
        instruction = (await rl.question('\n> ')).trim()
      } catch {
        break
      }
      if (!instruction) continue
      if (instruction.startsWith('/')) {
        const commandResult = await executeSlashCommand(commands, instruction, { output })
        if (!commandResult.found) {
          console.log(`Unknown slash command: /${commandResult.parsed.name}. Use /help to list commands.`)
        } else if (commandResult.result?.action === 'exit') {
          break
        }
        continue
      }
      await execute(instruction)
    }
  } finally {
    rl.close()
  }
}

export { createConfirmationHandler }
