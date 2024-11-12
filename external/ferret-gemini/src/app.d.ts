declare namespace FerretGenimi {

  interface HistoryMsgItem {
    userName: string
    userId: string
    msg: string
    time: number
  }

  interface Config {
    baseDir: string
    ctx: import('@koishijs/core').Context
    selfId: string
    adminIds: string[]
    acceptGroupIds: string[]
    model: {
      model: string
      apiKey: string
      cacheTime: number
    },
    proxy: {
      baseUrl: string
      customHeaders: Record<string, string>
    },
    contents: {
      maxLength: number
      prompt: string
    },
    send: {
      probability: number
      spliteChar: string
    },
    command: {
      addExpression: string
      getExpressionList: string
      deleteExpression: string
    }
  }
}