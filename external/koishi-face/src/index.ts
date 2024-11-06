import { Context, h, Schema } from 'koishi'
import { useFaceDataBase } from './dataBase'

export const name = 'koishi-face'
export const usage = `群聊表情包插件：
指令：
#添加表情 <message:text>
#删除表情 <id:number>
#搜索表情 <key:text>
#表情列表`
export const inject = ['database'];
export interface Config {
  maxCacheTime: number
  debounceTime: number
}

export const Config: Schema<Config> = Schema.object({
  maxCacheTime: Schema.number().default(60).description('添加表情过期时间，单位秒'),
  debounceTime: Schema.number().default(1000).description('触发表情的间隔时间，单位毫秒(ms)。'),
})

export function apply(ctx: Context, config: Config) {
  const { maxCacheTime, debounceTime } = config
  const faceDataBase = useFaceDataBase(ctx)
  const addFaceChache = new Map<string, {
    time: number
    message: string
  }>()
  let lastTime = 0
  // write your plugin here
  ctx.command('#添加表情 <message:text>')
    .action(async ({ session }, message) => {
      if (!message) return
      if (message.length > 256) {
        return `关键字长度不能超过256个字符`
      }
      const user = session.event.user
      const channel = session.event.channel
      if (!channel.id || !user.id) {
        return `添加失败，请在群聊中使用`
      }
      addFaceChache.set(`${user.id}-${channel.id}`, {
        time: Date.now(),
        message
      })
      return `请发送要添加的表情`
    })
  ctx.command('#删除表情 <id:number>')
    .action(async ({ session }, id) => {
      try {
        const face = await faceDataBase.queryItem({ id })
        if (face.length === 0) {
          return `表情不存在`
        }
        const user = session.event.user
        if (face[0].createrId !== user.id) {
          return `无权限删除`
        }
        await faceDataBase.deleteItem(id)
        return `删除成功`
      } catch (error) {
        return `删除失败:\n${JSON.stringify(error, null, 2)}`
      }
    })
  ctx.command('#搜索表情 <key:text>')
    .action(async ({ session }, key) => {
      try {
        const channel = session.event.channel
        if (!channel.id) return `搜索失败，请在群聊中使用`
        const face = await faceDataBase.getItem(key, channel.id)
        return `表情:\n${face.map(item => `id:${item.id}  key:${item.key}  value:${item.value}`).join('\n\n')}`
      } catch (error) {
        return `搜索失败:\n${JSON.stringify(error, null, 2)}`
      }
    })

  ctx.command('#表情列表')
    .action(async ({ session }) => {
      const user = session.event.user
      const faces = await faceDataBase.queryItem({ createrId: user.id })
      return `表情:\n${faces.map(item => `id:${item.id}  key:${item.key} ${item.type === 'text' ? '文字' : '图片'}  value:${item.type === 'text' ? item.value : '[图片]'}`).join('\n\n')}`
    })
  ctx.on('message', async (session) => {
    
    const user = session.event.user
    const channel = session.event.channel
    if (!channel.id) return
    const cache = addFaceChache.get(`${user.id}-${channel.id}`)
    if (cache && Date.now() - cache.time < 1000 * maxCacheTime) {
      // 说明正在添加表情
      try {
        const [image] = h.select(session.elements, 'img')
        const [text] = h.select(session.elements, 'text')
        if (!image && !text) {
          return session.send(`获取表情失败，请重试！`)
        }
        const element = image || text
        const value = element.attrs?.src || element.attrs?.content
        await faceDataBase.addItem({
          key: cache.message,
          createrId: user.id,
          groupId: channel.id,
          type: element.type as 'text' | 'img',
          value: value,
        })
        addFaceChache.delete(`${user.id}-${channel.id}`)
        return session.send(`添加成功`)
      } catch (error) {
        console.error(error);
        return session.send(`添加失败:\n${JSON.stringify(error, null, 2)}`)
      }
    } else if (cache) {
      addFaceChache.delete(`${user.id}-${channel.id}`)
      return session.send(`添加失败，请在${maxCacheTime}秒内完成。请重试！`)
    }
    // 发送表情
    if (Date.now() - lastTime < debounceTime) {
      return
    }
    
    const face = await faceDataBase.getItem(session.content,channel.id)
    if (face && face.length > 0) {
      const random = Math.floor(Math.random() * face.length)
      const { type, value } = face[random]
      if (type === 'text') {
        await session.send(value)
      } else if (type === 'img') {
        await session.send(h('img', { src: value }))
      }
      lastTime = Date.now()
    }
  })
}
