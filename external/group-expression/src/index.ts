import { Context, h } from 'koishi'
import { initConfig, SchemaConfig } from './config'
import { addFace, deleteFace, searchFace } from './face'
import { readImage2base64 } from './file'

export const name = 'group-expression'
export const usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>插件使用说明</title>
</head>
<body>
<h1>插件使用说明</h1>
<p>本插件是完美兼容云崽的喵喵插件的表情管理。</p>
<p>如果你使用过云崽的喵喵插件的添加/删除功能，那你会更容易上手本插件的！</p>
<h2>数据迁移</h2>
<p>本插件支持从云崽的喵喵插件迁移数据。</p>
<p>迁移方法：</p>
<ul>
  <li>将喵喵云仔机器人的/Miao-Yunzai/data/目录下的face和textJson文件夹复制到koishi根目录data/group-expression/目录下</li>
  <p>目录示例：</p>
  <p>data/group-expression/face/[群号]/xxx.png</p>
  <p>data/group-expression/textJson/[群号].json</p>
</ul>
<h2>使用示例</h2>
<ul>
<li>添加表情：<code>#添加表情 [字符串]</code></li>
<li>删除表情：<code>#删除表情 [字符串] [序号]</code></li>
<li>搜索表情：<code>#搜索表情 [字符串] [页码]</code></li>
<li>查看表情：<code>#查看表情 [字符串] [序号]</code></li>

</ul>
</body>
</html>

`;
export const Config = SchemaConfig

export interface AddFaceMessage {
  time: number
  message: string
}

export function apply(ctx: Context, config: GroupExpression.Config) {
  const { command, keyLimitLength, pageSize } = initConfig(ctx, config)
  const addFaceTempMap = new Map<string, AddFaceMessage>()
  ctx.command(`${command.addFaceCommand} <message>`)
    .alias('#添加表情')
    .action(async ({ session }, message) => {
      if (!message.trim()) return `请输入要添加的关键字`
      if (message.length > keyLimitLength) {
        return `关键字长度不能超过${keyLimitLength}个字符`
      }
      const user = session.event.user
      const channel = session.event.channel
      if (!channel.id || !user.id) {
        return `添加失败，请在群聊中使用`
      }
      addFaceTempMap.set(`${user.id}-${channel.id}`, {
        message,
        time: Date.now(),
      })
      return `请发送要添加的表情`
    })
  ctx.command(`${command.deleteFaceCommand} <key> <index:number>`)
    .alias('#删除表情')
    .action(async ({ session }, key, index) => {
      const user = session.event.user
      const channel = session.event.channel
      try {
        await deleteFace({ group_id: channel.id, key, index, user })
        return `删除表情成功！`
      } catch (error) {
        return error?.message || `删除表情失败，请重试！`
      }
    })
  ctx.command(`${command.searchFaceCommand} <key> [page:number]`)
    .alias('#搜索表情')
    .action(async ({ session }, key, page = 1) => {
      if (page < 1) {
        page = 1
      }
      page = page - 1
      const channel = session.event.channel
      try {
        const list = await searchFace({ group_id: channel.id, key })
        if (list.length === 0) {
          return `没有找到表情`
        }
        const maxPage = Math.ceil(list.length / pageSize)
        if (page > maxPage) {
          return `没有更多页了`
        }
        const result = list.slice(page * pageSize, (page + 1) * pageSize).map(([item], index) => {
          switch (item.type) {
            case 'text':
              return `序号：${index}\n内容：${item.text.slice(0, 10) + (item.text.length > 10 ? '...' : '')}\n`
            case 'image':
              return `序号：${index}\n内容：[图片]\n`
          }
        }).join('\n')
        if (!result.trim()) return `没有找到表情`
        return result
      } catch (error) {
        return error?.message || `搜索表情失败，请重试！`
      }
    })

  ctx.command(`${command.showFaceCommand} <key> <index:number>`)
    .alias('#查看表情')
    .action(async ({ session }, key, index) => {
      const channel = session.event.channel
      try {
        const list = await searchFace({ group_id: channel.id, key })
        if (index > list.length - 1 || index < 0) {
          return `没有这个序号`
        }
        const [item] = list[index]
        if (!item) return `没有这个序号`
        switch (item.type) {
          case 'text':
            return item.text
          case 'image':
            const base64 = readImage2base64(item.local)
            return h('img', { src: `data:image/png;base64,${base64}` })
        }
      } catch (error) {
        return error?.message || `查看表情失败，请重试！`
      }
    })
  let lastTriggerTime = 0
  ctx.on('message', async (session) => {
    if (Date.now() - lastTriggerTime < config.debounceTime * 1000) {
      return
    }
    const user = session.event.user
    if (user.id === config.selfId) return
    const channel = session.event.channel
    const cache = addFaceTempMap.get(`${user.id}-${channel.id}`)
    if (cache) {
      if (Date.now() - cache.time > 1000 * config.addFaceTimeout) {
        addFaceTempMap.delete(`${user.id}-${channel.id}`)
        session.send(`添加表情超时，请重新添加！`)
        return
      }
      // 添加表情
      try {
        await addFace({
          elements: session.elements,
          user,
          group_id: channel.id,
          key: cache.message,
        })
        addFaceTempMap.delete(`${user.id}-${channel.id}`)
        session.send(`添加表情成功！`)
        return
      } catch (error) {
        session.send(error?.message || `添加表情失败，请重试！`)
        addFaceTempMap.delete(`${user.id}-${channel.id}`)
        return
      }
    }
    // 搜索表情
    const [searchKey] = h.select(session.elements, 'text')
    if (searchKey?.attrs?.content?.trim()) {
      const list = await searchFace({ group_id: channel.id, key: searchKey.attrs.content })
      if (list.length === 0) return
      const radomIndex = Math.floor(Math.random() * list.length)
      const [item] = list[radomIndex]
      if (!item) return
      switch (item.type) {
        case 'text':
          session.send(item.text)
          break
        case 'image':
          const base64 = readImage2base64(item.local)
          session.send(h('img', { src: `data:image/png;base64,${base64}` }))
          break
      }
    }
  })
}
