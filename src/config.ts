import { z } from 'zod'

import DEFAULT_CONFIG from './config/settings.json' assert { type : 'json' }

type Settings = z.infer<typeof config>

const DEBUG = process.env.DEBUG === 'true'

export const config = z.object({
  db_path     : z.string(),
  server_port : z.number(),
})

export default async function load_config () : Promise<Settings> {
  try {
    // Get the path to the config file from the command line arguments
    const config_path = process.argv
      .find((arg) => arg.startsWith('--conf='))
      ?.split('=').at(1)
    // If no config path is provided, use the default config
    if (!config_path) return DEFAULT_CONFIG
    // Log the config path.
    console.log('[ config ] loading config from:', config_path)
    // Import the config file as a JSON object
    const config_json = await import(config_path, { assert : { type : 'json' } })
    // Parse the config object and return it
    return config.parse(config_json)
  } catch (error) {
    // If an error occurs, log it and return the default config
    console.error('[ config ] error loading config, using default settings...')
    if (DEBUG) console.error(error)
    return DEFAULT_CONFIG
  }
}