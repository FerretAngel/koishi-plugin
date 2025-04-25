import { Context, h, Schema, Session, Logger } from 'koishi'

export const name = 'xubin-store'

export interface Config { }

const PromptVariable = {
  userId: '{uid}',
  userName: '{uname}',
  channelId: '{gid}',
  channelName: '{gname}',
}

const defaultPrompt = `
你的名字是徐斌，是一个玩具店店长。
以下是当前用户信息：
\`\`\`json
{
  "uid": "{uid}",
  "username": "{uname}",
  "groupid": "{gid}",
  "groupname": "{gname}"
}
\`\`\`
`

export const Config: Schema<Config> = Schema.object({
  api: Schema.object({
    url: Schema.string().required().description('后端服务API地址'),
    token: Schema.string().required().description('后端服务API Token'),
  }),
  trigger: Schema.object({
    keyword: Schema.string().default('徐斌').max(10).description('触发关键词，当收到的消息包含此关键词时触发'),
    selfId: Schema.string().required().description('当前登录的QQ号,用于过滤自身消息。避免死循环'),
  }),
  model: Schema.object({
    prompt: Schema.string().default(defaultPrompt).description(`模型人设文案可以使用的变量：${Object.values(PromptVariable).join(',')}，例如：{uid}表示用户ID`),
    maxTokens: Schema.number().default(100).description('模型最大输出TOKEN数'),
  }),
  reply: Schema.object({
    busy: Schema.string().default('忙着呢').description('忙碌状态的回复内容'),
    error: Schema.string().default('心情不好打烊了，明天再来吧').description('错误状态的回复内容'),
    empty: Schema.string().default('叽里咕噜说什么呢').description('空状态的回复内容'),
  }),
  groupList: Schema.object({
    isWhite: Schema.boolean().default(true).description('是否为白名单制'),
    groupList: Schema.array(Schema.string()).default([]).description('群组列表'),
  }),
  // adminList: Schema.array(Schema.string()).default([]).description('管理员列表,出错了会将错误信息私发给管理员'),
})

export function apply(ctx: Context) {
  const busyMap = new Set<string>()
  busyMap.add(ctx.config?.trigger?.selfId)
  const logger = new Logger('xubin-store')

  /**
   * 发送忙碌状态
   * @param session 
   */
  const sendBusy = (session: Session<never, never, Context>) => {
    session.send(ctx.config?.trigger?.busy ?? '忙着呢')
  }
  /**
   * 发送错误状态
   * @param session 
   */
  const sendError = (session: Session<never, never, Context>, error: string) => {
    session.send(ctx.config?.trigger?.error ?? '心情不好打烊了，明天再来吧')
  }

  /**
   * 是否是允许的群组
   */
  const isAllowGroup = (groupId: string) => {
    if (ctx.config?.groupList?.isWhite) {
      return ctx.config?.groupList?.groupList.includes(groupId)
    }
    return !ctx.config?.groupList?.groupList.includes(groupId)
  }

  // write your plugin here
  ctx.on('message', async (session) => {
    const [searchKey] = h.select(session.elements, 'text')
    if (!searchKey?.attrs?.content?.trim() || !searchKey.attrs.content.includes(ctx.config?.trigger?.keyword)) return
    const user = session.event.user
    if (busyMap.has(user.id)) return sendBusy(session)
    const channel = session.event.channel
    if (channel?.id && busyMap.has(channel.id)) {
      return sendBusy(session)
    }
    if (!isAllowGroup(channel?.id)) return
    const clearBusy = () => {
      busyMap.delete(user.id)
      busyMap.delete(channel?.id)
    }
    const getPrompt = (): string => {
      const prompt: string = ctx.config?.model?.prompt ?? defaultPrompt
      return prompt.replace(PromptVariable.userId, user.id).replace(PromptVariable.userName, user.name).replace(PromptVariable.channelId, channel?.id).replace(PromptVariable.channelName, channel?.name)
    }
    const url = ctx.config?.api?.url
    const prompt = getPrompt()
    const maxTokens = ctx.config?.model?.maxTokens
    if (!url || !prompt || !maxTokens) {
      clearBusy()
      return session.send('配置错误，请检查配置后重试')
    }
    logger.info(JSON.stringify({
      maxTokens,
      message: searchKey.attrs.content,
      system: prompt,
    }))
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          maxTokens,
          messages: searchKey.attrs.content,
          system: prompt,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.config?.api?.token}`,
        },
      })
      if (!res.ok) {
        clearBusy()
        logger.error(res)
        return sendError(session, `请求失败，错误码：${res.status}`)
      }
      const data = await res.text()
      if (!data?.trim()) return
      session.send(data)
    } catch (error) {
      logger.error(error)
      sendError(session, `请求失败，错误信息：${error?.message}`)
    } finally {
      clearBusy()
    }
  })
}
