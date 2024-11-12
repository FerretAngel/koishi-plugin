import { Context, Schema } from "koishi"

export const SchemaConfig: Schema<Omit<FerretGenimi.Config, 'baseDir' | 'ctx'>> = Schema.intersect([
  Schema.object({
    acceptGroupIds: Schema.array(Schema.string()).description('接受消息的群组id'),
    adminIds: Schema.array(Schema.string()).description('管理员id'),
    model: Schema.object({
      model: Schema.string().default('models/gemini-1.5-pro-001').description('模型'),
      apiKey: Schema.string().description('apiKey'),
      cacheTime: Schema.number().default(60 * 60).description('缓存时间(秒)'),
    }).collapse().description('模型设置'),
    proxy: Schema.object({
      baseUrl: Schema.string().default('https://generativelanguage.googleapis.com').description('代理地址'),
      customHeaders: Schema.dict(Schema.string(), Schema.string()).description('自定义请求头'),
    }).collapse().description('代理设置'),
    selfId: Schema.string().description('机器人id'),
    contents: Schema.object({
      maxLength: Schema.number().default(10).description('记忆的消息条数'),
      prompt: Schema.string().default('你是一个淘气的男孩子，请用淘气的语气回复。你现在正在一个群聊里，根据历史消息回复。回复内容请用中文，尽量简短。').description('提示词'),
    }).collapse().description('上下文设置'),
    send: Schema.object({
      probability: Schema.number().max(1).min(0).default(0.1).description('回复概率'),
      spliteChar: Schema.string().default('。').description('单句分隔符'),
    }).collapse().description('发送设置'),
    command: Schema.object({
      addExpression: Schema.string().default('添加表情').description('添加表情包命令'),
      getExpressionList: Schema.string().default('表情列表').description('获取表情包列表命令'),
      deleteExpression: Schema.string().default('删除表情').description('删除表情包命令'),
    }).collapse().description('命令设置'),
  })
])

let globalConfig: FerretGenimi.Config | undefined
export const initConfig = (ctx: Context, config: FerretGenimi.Config) => {
  globalConfig = {
    ctx,
    baseDir: ctx.baseDir,
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