import { h, Session } from "koishi"
import { useConfig } from "./config"
import { getExpressionBase64, getExpressionList, getExpressionListByKey } from "./expression"


const actionMap: Record<string, (value: string, session: Session) => boolean> = {
  poke: (value: string, session: Session) => {
    const groupId = session.event.channel.id
    const { send: { napcatHttpUrl } } = useConfig()
    fetch(`${napcatHttpUrl}/group_poke`, {
      method: 'POST',
      body: JSON.stringify({
        group_id: groupId,
        user_id: value
      })
    })
    return true
  },
  at: (value: string, session: Session) => {
    session.send(`<at id="${value}"/>`)
    return true
  },
  expression: (value: string, session: Session) => {
    const list = getExpressionListByKey(value)
    if (list.length === 0) return false
    const randomIndex = Math.floor(Math.random() * list.length)
    const [item] = list[randomIndex]
    if (!item) return false
    const base64 = getExpressionBase64(value, item)
    session.send(h('img', { src: base64 }))
    return true
  }
}

export const getActionList = () => {
  return Object.keys(actionMap)
}

export const getPrompt = () => {
  const { contents, send } = useConfig()
  return `${contents.prompt}。每句话之间用${send.spliteChar}分割。你可以添加动作[${getActionList().join(',')}]。添加格式为{{动作:值}},将动作视为一句话。expression可选值:${getExpressionList().join(',')}。其他动作的值为用户的ID`
}

export const getActionRes = (key: string, value: string, session: Session) => {
  const func = actionMap[key]
  if (typeof func === 'function') {
    return func(value, session)
  }
  return false
}
