import path from 'path'
import fs from 'fs/promises'
import { SEPARATOR } from './index.js'
import { DEFAULT_MAX_STEPS } from '../agentloop/src/loop.js'

export async function readOptionalFile (filePath = '', label = 'file') {
  if (!filePath.trim()) return ''
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath)
  try {
    return await fs.readFile(resolvedPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${label} not found: ${filePath}`)
    }
    throw error
  }
}

export function printConfigVar ({ key, value, label }) {
  console.log(`\x1b[36m${label ?? key}:\x1b[0m ${value}`)
}

export function printConfig (config = {}) {
  console.log(SEPARATOR)
  printConfigVar({ label: 'Current working directory', value: process.cwd() })
  printConfigVar({ label: 'Agent working directory', value: config.cwd || '(not specified)' })
  printConfigVar({ label: 'Wakeup file', value: config.wakeup || '(not used)' })
  printConfigVar({ label: 'Max steps', value: config.maxSteps ?? DEFAULT_MAX_STEPS })
  printConfigVar({ label: 'Server', value: config.server })
  printConfigVar({ label: 'Primary model', value: config.primaryModel })
  printConfigVar({ label: 'Execution mode', value: config.executionMode ?? 'interactive' })
  printConfigVar({ label: 'Auto approve', value: config.autoApprove })
  console.log(SEPARATOR)
}
