import { Context } from 'koishi'
import { initConfig, SchemaConfig } from './config'

export const name = 'ferret-genimi'

export const Config = SchemaConfig

export function apply(ctx: Context, config: FerretGenimi.Config) {
  initConfig(ctx, config)
  // write your plugin here
}
