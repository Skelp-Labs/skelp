import readline from 'readline/promises'

function parseBoolean (value, fallback) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  if (['y', 'yes', 'true', '1'].includes(normalized)) return true
  if (['n', 'no', 'false', '0'].includes(normalized)) return false
  throw new Error('Expected yes or no.')
}

function parseMaxSteps (value, fallback) {
  if (!value.trim()) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('Max steps must be a positive integer.')
  return parsed
}

export async function setupConfig (currentConfig, { input, output } = {}) {
  const rl = readline.createInterface({ input, output })
  const config = { ...currentConfig }
  try {
    config.server = (await rl.question(`Server [${config.server}]: `)).trim() || config.server
    const apiKey = await rl.question(`API key [${config.apiKey ? 'configured' : 'none'}]: `)
    if (apiKey.trim()) config.apiKey = apiKey.trim()
    else delete config.apiKey
    config.primaryModel = (await rl.question(`Primary model [${config.primaryModel}]: `)).trim() || config.primaryModel
    config.autoApprove = parseBoolean(await rl.question(`Auto approve [${config.autoApprove ? 'Y/n' : 'y/N'}]: `), config.autoApprove)
    config.maxSteps = parseMaxSteps(await rl.question(`Max steps [${config.maxSteps}]: `), config.maxSteps)
    return config
  } finally {
    rl.close()
  }
}
