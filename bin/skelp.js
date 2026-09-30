#!/usr/bin/env node

import os from 'os'
import path from 'path'
import process, { stdin as input, stdout as output } from 'process'
import fs from 'fs/promises'
import readline from 'readline/promises'
import { ArgumentParser } from 'argparse'
import { createAgentLoop } from '../packages/agentloop/src/index.js'
import { createOllamaClient } from '../packages/llm/ollama-client.js'
import { detectProvider } from '../packages/detect/detect-provider.js'
import { createResponseRenderer, createToolRenderer } from '../packages/markdown/render-response.js'
import { createChatLog } from '../packages/skelp/chat-log.js'
import registerFsTools from '../packages/skills/filesystem/tools.js'
import registerTerminalTools from '../packages/skills/terminal/tools.js'

const configDirectory = path.join(os.homedir(), '.skelp')
const configPath = path.join(configDirectory, 'config.json')
const legacyConfigPath = path.join(os.homedir(), '.skelprc')
const defaults = {
  server: 'auto',
  primaryModel: 'local-ai-model',
  tone: 'concise, friendly and helpful',
  userSystem: '',
  autoApprove: false
}

async function readConfig () {
  try {
    return { ...defaults, ...JSON.parse(await fs.readFile(configPath, 'utf8')) }
  } catch {
    try {
      return { ...defaults, ...JSON.parse(await fs.readFile(legacyConfigPath, 'utf8')) }
    } catch {
      return { ...defaults }
    }
  }
}

async function writeConfig (config) {
  await fs.mkdir(configDirectory, { recursive: true })
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

async function runConfigCommand (args) {
  const config = await readConfig()
  if (args.action === 'list') {
    console.log(JSON.stringify(config, null, 2))
    return
  }
  if (args.action === 'get') {
    console.log(config[args.key] ?? '')
    return
  }
  if (args.action === 'set') {
    const value = args.value
    config[args.key] = value === 'true' ? true : value === 'false' ? false : value
    await writeConfig(config)
    return
  }
  if (args.action === 'reset') {
    await writeConfig(defaults)
  }
}

function parseArguments () {
  const rawArgs = process.argv.slice(2)
  if (rawArgs[0] !== 'config') {
    const cwdIndex = rawArgs.indexOf('--cwd')
    const hasCwd = cwdIndex >= 0 && rawArgs[cwdIndex + 1]
    const cwd = hasCwd ? rawArgs[cwdIndex + 1] : process.cwd()
    const prompt = hasCwd
      ? [...rawArgs.slice(0, cwdIndex), ...rawArgs.slice(cwdIndex + 2)]
      : rawArgs
    return { command: null, prompt, cwd, executionMode: 'autopilot' }
  }

  const parser = new ArgumentParser({ description: 'A minimal developer shell powered by an OpenAI-compatible model.' })
  const config = parser.add_subparsers({ dest: 'command' })
  const configParser = config.add_parser('config', { help: 'Manage Skelp configuration.' })
  const action = configParser.add_subparsers({ dest: 'action', required: true })
  action.add_parser('list', { help: 'List configuration.' })
  const get = action.add_parser('get', { help: 'Get a configuration value.' })
  get.add_argument('key')
  const set = action.add_parser('set', { help: 'Set a configuration value.' })
  set.add_argument('key')
  set.add_argument('value')
  action.add_parser('reset', { help: 'Reset configuration to defaults.' })
  return parser.parse_args(rawArgs)
}

function createInterface () {
  return readline.createInterface({ input, output })
}

async function runCommand (command, commandCwd, onStream, background = false) {
  const { exec } = await import('child_process')
  if (background) {
    const child = exec(command, { cwd: commandCwd, detached: true, windowsHide: true })
    child.unref()
    return `Started in background (pid ${child.pid}).`
  }

  return new Promise((resolve, reject) => {
    exec(command, { cwd: commandCwd }, (error, stdout, stderr) => {
      onStream?.(stdout)
      onStream?.(stderr)
      if (error) reject(error)
      else resolve(stdout || stderr || 'Command completed.')
    })
  })
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

async function run (prompt, options = {}) {
  const config = await readConfig()
  if (config.server === 'auto') {
    const provider = await detectProvider()
    if (!provider) {
      throw new Error('No local OpenAI-compatible provider was detected. Set "server" in ~/.skelprc.')
    }
    config.server = provider.url
    if (!config.primaryModel || config.primaryModel === defaults.primaryModel || config.primaryModel === 'skelp:latest') {
      config.primaryModel = provider.model
    }
  }
  const client = createOllamaClient(config)
  const rl = createInterface()
  const cwd = path.resolve(options.cwd || process.cwd())
  const executionMode = options.executionMode || 'interactive'
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
  const agent = createAgentLoop({
    client,
    tools,
    systemPrompt: [
      config.tone,
      config.userSystem,
      `Execution mode: ${executionMode}. In autopilot mode, execute the requested plan without asking for confirmation. In interactive mode, ask before taking consequential actions.`
    ].filter(Boolean).join('\n')
  })
  const chatLog = createChatLog({ prompt, config })
  try {
    const renderer = createResponseRenderer()
    const tools = createToolRenderer()
    try {
      const result = await agent.executeGoal(prompt, (delta) => renderer.writeDelta(delta), {
        onToolCall: (toolCall) => {
          tools.onToolCall(toolCall)
          return chatLog.writeToolCall({ ...toolCall, messages: agent.messages })
        },
        onToolResult: tools.onToolResult,
        onStatus: tools.onStatus,
        onStep: (step) => chatLog.writeStep(step)
      })
      renderer.end()
      await chatLog.write(agent.messages, result)
    } catch (error) {
      await chatLog.write(agent.messages, null, error)
      throw error
    }
  } finally {
    rl.close()
  }
}

const args = parseArguments()
if (args.command === 'config') {
  runConfigCommand(args).catch((error) => {
    console.error(`skelp: ${error.message}`)
    process.exitCode = 1
  })
} else if (!args.prompt.length) {
  console.error('Usage: skelp "your request"')
  process.exitCode = 1
} else {
  run(args.prompt.join(' '), args).catch((error) => {
    console.error(`skelp: ${error.message}`)
    process.exitCode = 1
  })
}
