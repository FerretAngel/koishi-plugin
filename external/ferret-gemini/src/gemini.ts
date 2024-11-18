import { GoogleGenerativeAI } from '@google/generative-ai'
import { useConfig } from './config'
import { h, Session } from 'koishi'
import { getHistoryMsg } from './history'
import { logger } from './log'
import { getActionRes, getPrompt } from './action'
import { type OneBot } from 'koishi-plugin-adapter-onebot'

let client: GoogleGenerativeAI | undefined
const getClient = () => {
  if (client) return client
  const { model } = useConfig()
  client = new GoogleGenerativeAI(model.apiKey)
  return client
}
const getModel = async () => {
  const { model, proxy } = useConfig()
  if (!model.apiKey) throw new Error('发送失败：没有apiKey')
  const client = getClient()
  console.log(getPrompt());
  return client.getGenerativeModel({
    model: model.model,
    systemInstruction: getPrompt(),
  }, {
    baseUrl: proxy.baseUrl,
    customHeaders: proxy.customHeaders,
  })
}
let loading = false
export const chat = async (session: Session) => {
  if (loading || !session.event.channel?.id) return
  loading = true
  try {
    const { send: { spliteChar } } = useConfig()
    const model = await getModel()
    const contents = getHistoryMsg(session.event.channel.id)
    console.log(contents)
    const result = await model.generateContentStream(contents)
    let chunkText = ''

    const send = () => {
      const list = chunkText.split(spliteChar)
      chunkText = list.pop() ?? ''
      list.forEach(item => {
        // 正则匹配{{动作:值}}
        const reg = /\{\{([^:]+):([^}]+)\}\}/g
        const match = item.match(reg)
        if (match) {
          const [action, value] = match.pop()?.replace('{{', '')?.replace('}}', '')?.split(':') ?? []
          if (action && value) {
            const res = getActionRes(action, value, session)
            if (res) return
          }
        }
        session.send(item)
      })
    }
    for await (const chunk of result.stream) {
      chunkText += chunk.text()
      send()
    }
  } catch (error) {
    logger.error(error)
  } finally {
    loading = false
  }
}

