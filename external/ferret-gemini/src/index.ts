import { Context, h, Session } from 'koishi'
import { initConfig, SchemaConfig } from './config'
import { addHistoryMsg } from './history'
import { chat } from './gemini'
import { logger } from './log'
import { addExpression, addExpressionBase64, deleteExpression, getExpressionBase64, getExpressionList, getExpressionListByKey } from './expression'
import { getActionRes } from './action'

export const name = 'ferret-genimi'

export const Config = SchemaConfig

export function apply(ctx: Context, config: FerretGenimi.Config) {
  const { selfId, acceptGroupIds, command, adminIds, botNameList, send: { probability } } = initConfig(ctx, config)
  const checkPermission = (session: Session) => {
    const userId = session.event.user.id
    if (!acceptGroupIds.includes(session.event.channel.id)) return false
    if (!adminIds.includes(userId)) {
      session.send(`无权访问`)
      return false
    }
    return true
  }
  ctx.command(`${command.addExpression} <key:text>`)
    .action(async ({ session }, key) => {
      if (!checkPermission(session)) return
      if (!key || !key.trim()) return `请输入表情包名称。\n例如：${command.addExpression} 哈哈`
      session.send('发送添加的表情')
      try {
        const res = await session.prompt(5000)
        const parsed = h.parse(res)
        const [img] = h.select(parsed, 'img')
        const [image] = h.select(parsed, 'image')
        if (img) {
          const url = img.attrs.src
          await addExpression(key, url)
        } else if (image) {
          const base64 = image.attrs.src
          addExpressionBase64(key, base64)
        }
        return `添加表情包成功`
      } catch (error) {
        return `添加表情包失败,请重试`
      }
    })
  ctx.command(`${command.getExpressionList} <key:text>`)
    .action(async ({ session }, key) => {
      if (!checkPermission(session)) return
      if (!key || !key.trim()) {
        const list = getExpressionList()
        if (list.length === 0) return `表情列表为空`
        return `表情列表：\n${list.join('\n')}`
      }
      const list = getExpressionListByKey(key)
      if (list.length === 0) return `表情列表为空`
      const resList: (h | string)[] = [`${key}表情列表：\n`]
      list.map((item, index) => {
        const base64 = getExpressionBase64(key, item)
        resList.push(`\n${index + 1}:\n`)
        resList.push(h('img', { src: base64 }))
      })
      return resList
    })
  ctx.command(`${command.deleteExpression} <key> <index:number>`)
    .action(async ({ session }, key, index) => {
      if (!checkPermission(session)) return
      if (!key || !key.trim()) return `请输入表情包名称`
      if (!index || isNaN(index)) return `请输入表情包序号`
      const list = getExpressionListByKey(key)
      if (index > list.length || index < 1) return `表情包序号超出范围`
      deleteExpression(key, list[index - 1])
      return `删除表情包成功`
    })
  botNameList.forEach(name => {
    ctx.command(`${name}<msg:text>`).action(async ({ session }, msg) => {
      addHistoryMsg({
        groupId: session.event.channel.id,
        userName: session.event.user.name,
        userId: session.event.user.id,
        msg,
        time: Date.now(),
      })
      chat(session)
    })
  })
  const triggerMap = new Map<string, number>()
  ctx.on('message', async (session) => {
    const user = session.event.user
    const groupId = session.event.channel
    if (!acceptGroupIds.includes(groupId.id)) return
    const [text] = h.select(session.elements, 'text')
    const [at] = h.select(session.elements, 'at')
    const msg = text.attrs.content
    if (msg.startsWith(command.addExpression) || botNameList.some(name => msg.startsWith(name))) return
    addHistoryMsg({
      groupId: groupId.id,
      userName: user.name,
      userId: user.id,
      msg,
      time: Date.now(),
    })
    if (user.id === selfId) return
    // 如果消息是@机器人，则立即响应
    if (at?.attrs?.id === selfId.toString()) {
      triggerMap.set(groupId.id, Date.now())
      chat(session)
      return
    }
    // 如果距离上次响应时间小于30秒，则继续响应
    const triggerTime = triggerMap.get(groupId.id) || 0
    if (Date.now() - triggerTime < 30000) {
      triggerMap.set(groupId.id, Date.now())
      chat(session)
      return
    }
    // 如果随机概率小于配置的概率，则响应
    if (Math.random() < probability) {
      chat(session)
    }
  })
}
