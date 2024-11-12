import { useConfig } from './config'
const historyList: FerretGenimi.HistoryMsgItem[] = []

export const addHistoryMsg = (item: FerretGenimi.HistoryMsgItem) => {
  const { contents } = useConfig()
  if (historyList.length >= contents.maxLength) {
    historyList.shift()
  }
  return historyList.push(item)
}

export const getHistoryMsg = () => {
  return historyList.map(item => {
    return `${item.userName}(${item.userId}):${item.msg}`
  }).join('\n')
}
