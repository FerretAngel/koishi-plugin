import { Context, h, Schema, Session, Logger } from 'koishi'

export const name = 'xubin-store'

export interface Config { }



export const Config: Schema<Config> = Schema.object({
  api: Schema.object({
    url: Schema.string().required().description('后端服务API地址'),
    token: Schema.string().required().description('后端服务API Token'),
  }),
  trigger: Schema.object({
    keyword: Schema.string().default('徐斌').max(10).description('触发关键词，当收到的消息包含此关键词时触发'),
    interval: Schema.number().default(60).description('间隔时间内无需at回复，单位：秒'),
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
  model: Schema.object({
    maxTokens: Schema.number().default(1024).description('模型最大输出TOKEN数'),
  }),
  // adminList: Schema.array(Schema.string()).default([]).description('管理员列表,出错了会将错误信息私发给管理员'),
})

export function apply(ctx: Context) {
  const busyMap = new Set<string>()
  const lastReplyMap = new Map<string, number>()
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

  const sendEmpty = (session: Session<never, never, Context>) => {
    session.send(ctx.config?.trigger?.empty ?? '叽里咕噜说什么呢')
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

  /**
   * 获取消息内容
   */
  const getMessageContent = (session: Session<never, never, Context>) => {
    const botId = session.selfId
    const content = h
      .select(session.elements, 'text')
      .join('')
      .trimStart()
    const isAt = session.elements?.some(
      (element) =>
        element.type === 'at' &&
        element.attrs?.['id'] === botId
    )
    const isQuote = session.quote?.user?.id === botId
    const includeBotName = content.includes(ctx.config?.trigger?.keyword)
    const user = session.event.user
    const channel = session.event.channel
    return {
      content,
      isAt,
      isQuote,
      includeBotName,
      user,
      channel,
    }
  }
  /**
   * 是否触发回复
   * 关键词，at，回复，用户上一次回复时间间隔
   */
  const triggerReply = (session: Session<never, never, Context>) => {
    const res = getMessageContent(session)
    const { isAt, isQuote, includeBotName, user, channel } = res
    const triggerId = `${user.id}-${channel?.id}`
    const triggerTime = lastReplyMap.get(triggerId)
    // 间隔时间内无需at回复
    if (triggerTime && Date.now() - triggerTime < ctx.config?.trigger?.interval * 1000) return res
    // 消息内容不包含关键词，不回复
    if (!isAt && !isQuote && !includeBotName) return null
    // 消息内容包含关键词，回复
    return res
  }

  // write your plugin here
  ctx.on('message', async (session) => {
    const res = triggerReply(session)
    if (!res) return
    const { user, channel, content } = res
    if (!content) return sendEmpty(session)
    if (busyMap.has(user.id)) return sendBusy(session)
    if (channel?.id && busyMap.has(channel.id)) {
      return sendBusy(session)
    }
    if (!isAllowGroup(channel?.id)) return
    const clearBusy = () => {
      busyMap.delete(user.id)
      busyMap.delete(channel?.id)
    }
    const url = ctx.config?.api?.url
    const maxTokens = ctx.config?.model?.maxTokens
    if (!url) {
      clearBusy()
      return session.send('配置错误，请检查配置后重试')
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          messages: content,
          groupId: channel?.id,
          userId: user.id,
          name: user.name,
          maxTokens,
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
      await session.send(h.quote(data))
    } catch (error) {
      logger.error(error)
      sendError(session, `请求失败，错误信息：${error?.message}`)
    } finally {
      clearBusy()
    }
  })
}
