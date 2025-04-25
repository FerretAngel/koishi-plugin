import { useConfig } from './config'
const historyMap = new Map<string, FerretGenimi.HistoryMsgItem[]>()
export const addHistoryMsg = (item: FerretGenimi.HistoryMsgItem) => {
  const { contents } = useConfig()
  const groupList = historyMap.get(item.groupId) || []
  if (groupList.length >= contents.maxLength) {
    groupList.shift()
  }
  if (!item.msg.trim()) return
  return historyMap.set(item.groupId, [...groupList, item])
}

export const getHistoryMsg = (groupId: string) => {
  return historyMap.get(groupId)?.map(item => {
    return `${item.userName}(${item.userId}):${item.msg}`
  }).join('\n')
}
