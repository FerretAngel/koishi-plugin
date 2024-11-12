import { useConfig } from "./config"
import { getExpressionBase64, getExpressionList, getExpressionListByKey } from "./expression"


const actionMap: Record<string, (value: string) => string> = {
  touch: (value: string) => `[CQ:touch,id=${value}]`,
  expression: (value: string) => {
    const list = getExpressionListByKey(value)
    if (list.length === 0) return ''
    const randomIndex = Math.floor(Math.random() * list.length)
    const [item] = list[randomIndex]
    if (!item) return ''
    const base64 = getExpressionBase64(value, item)
    return base64
  }
}

export const getActionList = () => {
  return Object.keys(actionMap)
}

export const getPrompt = () => {
  const { contents, send } = useConfig()
  return `${contents.prompt},每句话之间用${send.spliteChar}分割。你可以添加动作[expression,${getActionList().join(',')}]。添加格式为{{动作:值}},将动作视为一句话。expression可选值:${getExpressionList().join(',')}。其他动作的值为用户的ID`
}

export const getCQRes = (key: string, value: string) => {
  const func = actionMap[key]
  if (typeof func === 'function') {
    return func(value)
  }
  return `{{${key}:${value}}}`
}
