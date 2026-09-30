import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

export function createChatLog ({ directory = path.join(os.homedir(), '.skelp', 'chats'), prompt, config } = {}) {
  const slug = crypto.randomBytes(4).toString('base64url').slice(0, 6)
  const id = `${Date.now()}-${slug}`
  const filePath = path.join(directory, `${id}.json`)
  const startedAt = new Date().toISOString()
  const toolCalls = []
  let writeQueue = Promise.resolve()

  function queueWrite (operation) {
    writeQueue = writeQueue.then(operation, operation)
    return writeQueue
  }

  return {
    id,
    filePath,
    write (messages, result, error, step) {
      return queueWrite(async () => {
        await fs.mkdir(directory, { recursive: true })
        const log = {
          id,
          startedAt,
          finishedAt: new Date().toISOString(),
          prompt,
          model: config?.primaryModel,
          server: config?.server,
          messages,
          toolCalls,
          step: step || null,
          result: result || null,
          error: error ? { message: error.message, name: error.name } : null
        }
        const temporaryPath = `${filePath}.${Date.now()}.tmp`
        await fs.writeFile(temporaryPath, `${JSON.stringify(log, null, 2)}\n`, 'utf8')
        await fs.rename(temporaryPath, filePath)
      })
    },
    async writeStep ({ step, remaining, messages }) {
      await this.write(messages, null, null, { step, remaining, completed: false })
    },
    async writeToolCall (toolCall) {
      toolCalls.push({
        ...toolCall,
        recordedAt: new Date().toISOString()
      })
      await this.write(toolCall.messages || [], null, null, {
        type: 'toolCall',
        step: toolCall.step,
        completed: false
      })
    }
  }
}
