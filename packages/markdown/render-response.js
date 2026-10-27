import process from 'process'
import { createMarkdownStream } from './index.js'

export function createResponseRenderer (output = process.stdout) {
  const markdown = createMarkdownStream()

  return {
    writeDelta (delta = {}) {
      const text = delta.content || delta.reasoning_content || ''
      if (text) output.write(markdown.push(text))
    },
    end () {
      output.write(`${markdown.end()}\n`)
    }
  }
}

export function createToolRenderer (output = process.stdout) {
  return {
    onToolCall ({ name, args = {} }) {
      const detail = args.command || args.path || ''
      output.write(`\n🛠️  ${name}${detail ? `: ${detail}` : ''}\n`)
    },
    onToolResult ({ name, result, error }) {
      if (name === 'execute_command') {
        output.write(`\n${error ? '❌ Command failed.' : '✅ Command completed.'}\n`)
        return
      }
      const summary = result?.type === 'image'
        ? `Attached image: ${result.path || 'image'}`
        : String(result || '').replace(/\s+/g, ' ').trim()
      output.write(`${error ? '❌' : '✅'} ${summary.slice(0, 160)}${summary.length > 160 ? '...' : ''}\n`)
    },
    onStatus (status) {
      output.write(`⏳ ${status}\n`)
    }
  }
}
