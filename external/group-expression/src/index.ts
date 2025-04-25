import { Context, h, Time } from 'koishi'
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
  ctx.command(`${command.addFaceCommand} <message>`)
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
      session.send('请发送要添加的表情')
      try {
        const res = await session.prompt(5000)
        const elements = h.parse(res)
        await addFace({
          elements: elements,
          user,
          group_id: channel.id,
          key: message,
        })
        return `添加表情成功！`
      } catch (error) {
        return `${error?.message || '添加表情失败,请重试'}`
      }
    })
  ctx.command(`${command.deleteFaceCommand} <key:text>`)
    .action(async ({ session }, key) => {
      const user = session.event.user
      const channel = session.event.channel
      if (!key.trim()) return `请输入要删除的关键词：${command.deleteFaceCommand} 关键词`
      let page = 0
      const list = await searchFace({ group_id: channel.id, key })
      if (list.length === 0) return `没有找到表情`
      if (list.length === 1) {
        try {
          await deleteFace({ group_id: channel.id, key, index: 0, user })
          return `删除表情成功！`
        } catch (error) {
          return `${error?.message || '删除表情失败,请重试'}`
        }
      }
      while (true) {
        const pageList = list.slice(page * pageSize, (page + 1) * pageSize)
        const resList: (h | string)[] = [`${key}的搜索结果（共计${list.length}条）：\n`]
        pageList.map(([item], index) => {
          resList.push(`${index + 1}:\n`)
          switch (item.type) {
            case 'text':
              resList.push(`${item.text.slice(0, 20) + (item.text.length > 20 ? '...' : '')}\n`)
              break
            case 'image':
              const base64 = readImage2base64(item.local)
              resList.push(h('img', { src: `data:image/png;base64,${base64}` }))
              break
          }
        })
        resList.push(`\n页码：${page + 1}/${Math.ceil(list.length / pageSize)}\n跳转页码指令示例：跳转 1\n请输入要删除的序号：`)
        session.send(resList)
        const res = await session.prompt(10000)
        if (!res || !res?.trim()) {
          session.send('本次操作已结束。')
          break;
        }
        if (res.trim().startsWith('跳转')) {
          const pageNum = parseInt(res?.trim()?.split(' ')?.pop())
          if (isNaN(pageNum)) {
            session.send(`请输入正确的页码`)
            continue
          }
          if (pageNum > 0 && pageNum <= Math.ceil(list.length / pageSize)) {
            page = pageNum - 1
            continue
          }
          session.send(`没有这个页码`)
        }
        const input = parseInt(res?.trim())
        if (isNaN(input)) {
          session.send(`请输入正确的序号`)
          continue
        }
        if (input > 0 && input <= pageList.length) {
          try {
            await deleteFace({ group_id: channel.id, key, index: input - 1, user })
            return `删除表情成功！`
          } catch (error) {
            return `${error?.message || '删除表情失败,请重试'}`
          }
        }
        session.send(`没有这个序号`)
      }
    })
  ctx.command(`${command.searchFaceCommand} <key>`)
    .action(async ({ session }, key) => {
      const channel = session.event.channel
      if (!key.trim()) return `请输入要搜索的关键词：${command.searchFaceCommand} 关键词`
      let page = 0
      const list = await searchFace({ group_id: channel.id, key })
      if (list.length === 0) return `没有找到表情`
      while (true) {
        const pageList = list.slice(page * pageSize, (page + 1) * pageSize)
        const resList: (h | string)[] = [`${key}的搜索结果（共计${list.length}条）：\n`]
        pageList.map(([item], index) => {
          resList.push(`${index + 1}:\n`)
          switch (item.type) {
            case 'text':
              resList.push(`${item.text.slice(0, 20) + (item.text.length > 20 ? '...' : '')}\n`)
              break
            case 'image':
              const base64 = readImage2base64(item.local)
              resList.push(h('img', { src: `data:image/png;base64,${base64}` }))
              break
          }
        })
        resList.push(`\n页码：${page + 1}/${Math.ceil(list.length / pageSize)}\n跳转页码指令示例：跳转 1`)
        session.send(resList)
        const res = await session.prompt(10000)
        if (!res || !res?.trim()) {
          session.send('本次搜索已结束。')
          break;
        }
        if (res.trim().startsWith('跳转')) {
          const pageNum = parseInt(res?.trim()?.split(' ')?.pop())
          if (isNaN(pageNum)) {
            session.send(`请输入正确的页码`)
            continue
          }
          if (pageNum > 0 && pageNum <= Math.ceil(list.length / pageSize)) {
            page = pageNum - 1
            continue
          }
          session.send(`没有这个页码`)
        }
      }
    })

  let lastTriggerTime = 0
  ctx.on('message', async (session) => {
    if (Date.now() - lastTriggerTime < config.debounceTime * 1000) return
    const user = session.event.user
    if (user.id === config.selfId) return
    const channel = session.event.channel
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
      lastTriggerTime = Date.now()
    }
  })
}
