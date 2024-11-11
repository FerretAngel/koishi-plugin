const historyList: string[] = []

export const getHistoryMsg = () => {
  return historyList.join('\n')
}
