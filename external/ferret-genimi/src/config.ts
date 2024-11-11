import { Context, Schema } from "koishi"

export const SchemaConfig: Schema<Omit<FerretGenimi.Config, 'baseDir' | 'ctx'>> = Schema.intersect([
  Schema.object({
    model: Schema.object({
      model: Schema.string().default('gemini-1.5-pro').description('模型'),
      apiKey: Schema.string().description('apiKey'),
      proxy: Schema.string().description('代理地址'),
    }).collapse().description('模型设置'),
    contents: Schema.object({
      maxLength: Schema.number().default(10).description('记忆的消息条数'),
      prompt: Schema.string().default('你是一个可爱的女孩子，请用可爱的语气回复').description('提示词'),
    }).collapse().description('上下文设置'),
    send: Schema.object({
      spliteChar: Schema.string().default('。').description('单句分隔符'),
    }).collapse().description('发送设置'),
  })
])

let globalConfig: FerretGenimi.Config | undefined
export const initConfig = (ctx: Context, config: FerretGenimi.Config) => {
  globalConfig = {
    ctx,
    ...config,
  }
  return globalConfig
}
export const useConfig = () => {
  if (!globalConfig) {
    throw new Error('FerretGenimi config is not initialized')
  }
  return globalConfig
}