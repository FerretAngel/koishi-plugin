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

const getPromptTimeoutMs = (seconds: number, fallbackSeconds = 60) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackSeconds * 1000
  return Math.floor(seconds * 1000)
}

const parseJumpPage = (input: string) => {
  const match = input.match(/^跳转\s+(\d+)$/)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

const isExitInput = (input: string) => {
  const normalized = input.trim().toLowerCase()
  return ['退出', '结束', '取消', 'q', 'quit', 'exit'].includes(normalized)
}

export function apply(ctx: Context, config: GroupExpression.Config) {
  const {
    command,
    keyLimitLength,
    pageSize,
    addFaceTimeout,
    searchFaceTimeout,
    deleteFaceTimeout
  } = initConfig(ctx, config)
  const commandPrefixes = [
    command.addFaceCommand,
    command.deleteFaceCommand,
    command.searchFaceCommand,
  ]
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1)

  ctx.command(`${command.addFaceCommand} <message>`)
    .action(async ({ session }, message) => {
      if (!message?.trim()) return `请输入要添加的关键字`
      if (message.length > keyLimitLength) {
        return `关键字长度不能超过${keyLimitLength}个字符`
      }
      const user = session.event.user
      const channel = session.event.channel
      if (!channel.id || !user.id) {
        return `添加失败，请在群聊中使用`
      }
      await session.send('请发送要添加的表情')
      try {
        const res = await session.prompt(getPromptTimeoutMs(addFaceTimeout))
        if (!res?.trim()) {
          return `添加表情超时，请在${addFaceTimeout}秒内发送内容后重试。`
        }
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
      if (!key?.trim()) return `请输入要删除的关键词：${command.deleteFaceCommand} 关键词`
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
        const pageList = list.slice(page * safePageSize, (page + 1) * safePageSize)
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
        resList.push(`\n页码：${page + 1}/${Math.ceil(list.length / safePageSize)}\n跳转页码指令示例：跳转 1\n请输入要删除的序号（输入“退出”结束）：`)
        await session.send(resList)
        const res = await session.prompt(getPromptTimeoutMs(deleteFaceTimeout))
        if (!res || !res?.trim()) {
          await session.send('本次操作已结束。')
          break;
        }
        const inputText = res.trim()
        if (isExitInput(inputText)) {
          await session.send('本次操作已结束。')
          break
        }
        const pageNum = parseJumpPage(inputText)
        if (pageNum !== null) {
          if (pageNum > 0 && pageNum <= Math.ceil(list.length / safePageSize)) {
            page = pageNum - 1
            continue
          }
          await session.send(`没有这个页码`)
          continue
        }
        const input = parseInt(inputText)
        if (isNaN(input)) {
          await session.send(`请输入正确的序号，或输入“跳转 页码”/“退出”。`)
          continue
        }
        if (input > 0 && input <= pageList.length) {
          try {
            const index = page * safePageSize + input - 1
            await deleteFace({ group_id: channel.id, key, index, user })
            return `删除表情成功！`
          } catch (error) {
            return `${error?.message || '删除表情失败,请重试'}`
          }
        }
        await session.send(`没有这个序号`)
      }
    })
  ctx.command(`${command.searchFaceCommand} <key>`)
    .action(async ({ session }, key) => {
      const channel = session.event.channel
      if (!key?.trim()) return `请输入要搜索的关键词：${command.searchFaceCommand} 关键词`
      let page = 0
      const list = await searchFace({ group_id: channel.id, key })
      if (list.length === 0) return `没有找到表情`
      while (true) {
        const pageList = list.slice(page * safePageSize, (page + 1) * safePageSize)
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
        resList.push(`\n页码：${page + 1}/${Math.ceil(list.length / safePageSize)}\n跳转页码指令示例：跳转 1\n输入“退出”结束搜索。`)
        await session.send(resList)
        const res = await session.prompt(getPromptTimeoutMs(searchFaceTimeout))
        if (!res || !res?.trim()) {
          await session.send('本次搜索已结束。')
          break;
        }
        const inputText = res.trim()
        if (isExitInput(inputText)) {
          await session.send('本次搜索已结束。')
          break
        }
        const pageNum = parseJumpPage(inputText)
        if (pageNum === null) {
          await session.send('请输入“跳转 页码”继续翻页，或输入“退出”结束。')
          continue
        }
        if (pageNum > 0 && pageNum <= Math.ceil(list.length / safePageSize)) {
          page = pageNum - 1
          continue
        }
        await session.send(`没有这个页码`)
      }
    })

  const lastTriggerTimeMap = new Map<string, number>()
  ctx.on('message', async (session) => {
    const user = session.event.user
    const channel = session.event.channel
    if (!channel.id) return
    const userId = session.userId || user?.id?.toString()
    if (!userId) return
    if (session.selfId && userId === session.selfId.toString()) return
    if (config.selfId && userId === config.selfId.toString()) return
    // 搜索表情
    const [searchKey] = h.select(session.elements, 'text')
    const content = searchKey?.attrs?.content?.trim()
    if (!content) return
    if (commandPrefixes.some(prefix => content.startsWith(prefix))) return
    const lastTriggerTime = lastTriggerTimeMap.get(channel.id) ?? 0
    if (Date.now() - lastTriggerTime < config.debounceTime * 1000) return
    const list = await searchFace({ group_id: channel.id, key: content })
    if (list.length === 0) return
    const radomIndex = Math.floor(Math.random() * list.length)
    const [item] = list[radomIndex]
    if (!item) return
    lastTriggerTimeMap.set(channel.id, Date.now())
    switch (item.type) {
      case 'text':
        await session.send(item.text)
        break
      case 'image':
        const base64 = readImage2base64(item.local)
        await session.send(h('img', { src: `data:image/png;base64,${base64}` }))
        break
    }
  })
}
