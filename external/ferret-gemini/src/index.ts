import { Context, h, Session } from 'koishi'
import { initConfig, SchemaConfig } from './config'
import { addHistoryMsg } from './history'
import { chat } from './gemini'
import { logger } from './log'
import { addExpression, addExpressionBase64, deleteExpression, getExpressionBase64, getExpressionList, getExpressionListByKey } from './expression'

export const name = 'ferret-genimi'

export const Config = SchemaConfig

export function apply(ctx: Context, config: FerretGenimi.Config) {
  const { selfId, acceptGroupIds, command, adminIds } = initConfig(ctx, config)
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
  ctx.on('message', async (session) => {
    const user = session.event.user
    const groupId = session.event.channel
    if (!acceptGroupIds.includes(groupId.id) || user.id === selfId) return
    const msg = session.content
    if (msg.startsWith(command.addExpression)) return
    addHistoryMsg({
      userName: user.name,
      userId: user.id,
      msg,
      time: Date.now(),
    })
    // chat(session)
  })
}
