function normalizeCommand (command) {
  if (!command || typeof command.name !== 'string' || typeof command.run !== 'function') {
    throw new TypeError('Commands require a name and a run function.')
  }
  return {
    ...command,
    name: command.name.replace(/^\//, '')
  }
}

export function createCommandRegistry (commands = []) {
  const registered = new Map()

  const register = (command) => {
    const normalized = normalizeCommand(command)
    registered.set(normalized.name, normalized)
    return normalized
  }

  commands.forEach(register)

  return {
    register,
    get: (name) => registered.get(name.replace(/^\//, '')),
    list: () => [...registered.values()],
    complete: (input) => {
      const prefix = input.trim().replace(/^\//, '').toLowerCase()
      return [...registered.values()]
        .filter(command => command.name.toLowerCase().startsWith(prefix))
        .map(command => `/${command.name}`)
    }
  }
}

export function parseCommand (input) {
  const value = input.trim()
  if (!value.startsWith('/')) return null

  const [name = '', ...args] = value.slice(1).split(/\s+/)
  return { name, args, input: value }
}

export async function runCommand (registry, input, context = {}) {
  const parsed = parseCommand(input)
  if (!parsed) return { handled: false }

  const command = registry.get(parsed.name)
  if (!command) return { handled: true, found: false, parsed }

  const result = await command.run({ ...context, ...parsed })
  return { handled: true, found: true, parsed, result }
}

export function createCompleter (registry) {
  return (line) => {
    if (!line.startsWith('/')) return [[], line]
    const completions = registry.complete(line)
    return [completions, line]
  }
}
