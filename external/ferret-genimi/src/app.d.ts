declare namespace FerretGenimi {
  interface Config {
    ctx: import('@koishijs/core').Context
    model: {
      model: string
      apiKey: string
      proxy: string
    },
    contents: {
      maxLength: number
      prompt: string
    },
    send: {
      spliteChar: string
    }
  }
}