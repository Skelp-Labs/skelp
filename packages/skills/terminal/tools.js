export default function registerTerminalTools ({ onStream, readlineInterface, autoApprove, askForConfirmation, runCommand, cwd, workspaceRoot }) {
  return [{
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Runs a shell command on the local machine and returns CLI output. Must NOT be an interactive command. For Python packages, use a project-local virtual environment (for example: python3 -m venv .venv && .venv/bin/python -m pip install <package>) instead of installing globally.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The exact shell command to run.' },
          cwd: { type: 'string', description: `Optional directory within workspace root (${workspaceRoot}) in which to run the command.` },
          background: { type: 'boolean', description: 'Run the command as a detached background process and return immediately.' }
        },
        required: ['command']
      }
    },
    onChunk: ({ accumulatedArgs }) => {
      let commandPreview = ''
      const match = (accumulatedArgs || '').match(/"command"\s*:\s*"([^"]*)/)
      if (match) {
        commandPreview = match[1]
      }
      if (readlineInterface && typeof readlineInterface.updateStatus === 'function') {
        readlineInterface.updateStatus(commandPreview ? `Command: ${commandPreview.slice(0, 40)}...` : 'Preparing command...')
      }
    },
    handler: async (args) => {
      let shouldExecute = true
      if (!autoApprove) {
        if (readlineInterface && typeof readlineInterface.updateStatus === 'function') {
          readlineInterface.updateStatus('Awaiting confirmation...')
        }
        shouldExecute = await askForConfirmation(args.command, readlineInterface)
      }
      if (shouldExecute) {
        if (readlineInterface && typeof readlineInterface.updateStatus === 'function') {
          readlineInterface.updateStatus(`Executing: ${args.command}...`)
        }
        if (onStream) {
          onStream(`\n\x1b[33m⚡ Executing command: ${args.command}...\x1b[0m\n`)
        }
        return await runCommand(args.command, args.cwd || cwd, onStream, Boolean(args.background))
      }
      if (onStream) {
        onStream('\n\x1b[31mx Execution skipped.\x1b[0m\n')
      }
      return 'Action execution was denied/cancelled by the user.'
    }
  }]
}
