import { Session } from "koishi"
import { useConfig } from "./config"
import { getHistoryMsg } from "./historyMsg"
import { logger } from "./log"
import { Content, GenerativeModel, GoogleGenerativeAI, Part } from '@google/generative-ai'

let Model: GenerativeModel | undefined
const getModel = () => {
  if (Model) return Model
  const { model } = useConfig()
  if (!model.apiKey) throw new Error('发送失败：没有apiKey')
  const client = new GoogleGenerativeAI(model.apiKey)
  Model = client.getGenerativeModel({ model: model.model })
  return Model
}


const getContent = () => {
  const { model, contents, send } = useConfig()
  const historyMsg = getHistoryMsg()
  if (!historyMsg) throw new Error('发送失败：没有历史消息')
  const prompt = contents.prompt ?? ''
  const content: Content[] = []
  content.push({
    role: 'system',
    parts: [{ text: prompt }]
  })
  content.push({
    role: 'user',
    parts: [{ text: historyMsg }]
  })
  return content
}


export const chat = async (session: Session) => {
  const { send } = useConfig()
  const model = getModel()
  const contents = getContent()
  const result = await model.generateContentStream({ contents })
  // Print text as it comes in.
  const sendMsgQueue = async () => {
    const errorQueue: string[] = []
    for await (const item of sendQueue) {
      try {
        await session.send(item)
      } catch (error) {
        logger.error(error)
        errorQueue.push(item)
      }
    }
    sendQueue.concat(errorQueue)
  }

  const sendQueue: string[] = []
  let text = ''
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    text += chunkText
    if (text.includes(send.spliteChar)) {
      const list = text.split(send.spliteChar)
      text = list.pop() ?? ''
      sendQueue.push(...list)
      sendMsgQueue()
    }
  }
}