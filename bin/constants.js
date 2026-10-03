import os from 'os'
import path from 'path'

export const DEFAULTS = {
  server: 'auto',
  primaryModel: 'local-ai-model',
  tone: 'concise, friendly and helpful',
  soul: 'standard',
  wakeup: '',
  userSystem: '',
  autoApprove: false,
  verbose: false,
  maxSteps: 8
}

const homeDirectory = path.join(os.homedir(), '.skelp')
const configPath = path.join(homeDirectory, 'config.json')
const legacyConfigPath = path.join(os.homedir(), '.skelprc')

export { homeDirectory, configPath, legacyConfigPath }