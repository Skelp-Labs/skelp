import { parseConfigValue, readPath, writePath } from './index.js'

export function createConfigCommands ({ getConfig, saveConfig, resetConfig, setupConfig }) {
  return [
    {
      name: 'list',
      description: 'List configuration.',
      run: async ({ output }) => {
        output.write(`${JSON.stringify(await getConfig(), null, 2)}\n`)
      }
    },
    {
      name: 'get',
      description: 'Get a configuration value.',
      run: async ({ args, output }) => {
        if (!args[0]) throw new Error('Usage: /config get <key>')
        output.write(`${readPath(await getConfig(), args[0]) ?? ''}\n`)
      }
    },
    {
      name: 'set',
      description: 'Set a configuration value.',
      run: async ({ args }) => {
        if (!args[0] || args[1] === undefined) throw new Error('Usage: /config set <key> <value>')
        const config = await getConfig()
        writePath(config, args[0], parseConfigValue(args.slice(1).join(' ')))
        await saveConfig(config)
      }
    },
    {
      name: 'reset',
      description: 'Reset configuration to defaults.',
      run: resetConfig
    },
    {
      name: 'setup',
      description: 'Interactively configure Skelp.',
      run: setupConfig
    }
  ]
}
