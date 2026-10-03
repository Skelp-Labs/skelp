import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'

function resolvePath (cwd, filePath) {
  const expandedPath = filePath === '~' || filePath.startsWith('~/')
    ? path.join(os.homedir(), filePath.slice(2))
    : filePath
  return path.isAbsolute(expandedPath) ? expandedPath : path.resolve(cwd, expandedPath)
}

export default function registerFsTools ({ onStream, cwd, readlineInterface }) {
  return [{
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Writes/Saves content text to a specified file path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Destination file path.' },
          content: { type: 'string', description: 'The text content to write.' }
        },
        required: ['path', 'content']
      }
    },
    onChunk: ({ delta, toolCall, accumulatedArgs }) => {
      const rawArgs = accumulatedArgs || ''
      const byteLen = Buffer.byteLength(rawArgs, 'utf8')
      let formattedSize = `${byteLen} B`
      if (byteLen >= 1024) {
        formattedSize = `${(byteLen / 1024).toFixed(1)} KB`
      }

      let filePath = ''
      try {
        // Try parsing full JSON or extract path property via regex from partial JSON
        const pathMatch = rawArgs.match(/"path"\s*:\s*"([^"]+)"/)
        if (pathMatch) {
          filePath = pathMatch[1]
        }
      } catch (e) {
        // Ignored
      }

      const statusMsg = filePath
        ? `Writing ${filePath} (${formattedSize})...`
        : `Writing file (${formattedSize})...`

      if (readlineInterface && typeof readlineInterface.updateStatus === 'function') {
        readlineInterface.updateStatus(statusMsg)
      }
    },
    handler: async (args) => {
      const bytes = Buffer.byteLength(args.content || '', 'utf8')
      if (readlineInterface && typeof readlineInterface.updateStatus === 'function') {
        readlineInterface.updateStatus(`Writing ${args.path} (${bytes} B)...`)
      }
      if (onStream) {
        onStream(`\n\x1b[33m⚡ Writing file: ${args.path} (${bytes} bytes)...\x1b[0m\n`)
      }
      const targetPath = resolvePath(cwd, args.path)
      await fsPromises.writeFile(targetPath, args.content || '', 'utf8')
      return `Successfully wrote to file ${args.path} (${bytes} bytes)`
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads contents of a file on the local file system.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Source file path to read.' }
        },
        required: ['path']
      }
    },
    onChunk: ({ delta, toolCall, accumulatedArgs }) => {
      let filePath = ''
      try {
        const pathMatch = (accumulatedArgs || '').match(/"path"\s*:\s*"([^"]+)"/)
        if (pathMatch) {
          filePath = pathMatch[1]
        }
      } catch (e) {
        // Ignored
      }

      if (filePath && readlineInterface && typeof readlineInterface.updateStatus === 'function') {
        readlineInterface.updateStatus(`Reading ${filePath}...`)
      }
    },
    handler: async (args) => {
      if (readlineInterface && typeof readlineInterface.updateStatus === 'function') {
        readlineInterface.updateStatus(`Reading ${args.path}...`)
      }
      if (onStream) {
        onStream(`\n\x1b[33m⚡ Reading file: ${args.path}...\x1b[0m\n`)
      }
      const targetPath = resolvePath(cwd, args.path)
      return await fsPromises.readFile(targetPath, 'utf8')
    }
  },
  {
    type: 'function',
    function: {
      name: 'attach_image',
      description: 'Attaches a local image so it can be visually analyzed. Use this when the user refers to an image file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Image file path.' }
        },
        required: ['path']
      }
    },
    handler: async (args) => {
      const targetPath = resolvePath(cwd, args.path)
      const image = await fsPromises.readFile(targetPath)
      const extension = path.extname(targetPath).toLowerCase()
      const mediaTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }
      return {
        type: 'image',
        path: targetPath,
        mediaType: mediaTypes[extension] || 'application/octet-stream',
        data: image.toString('base64')
      }
    }
  }]
}
