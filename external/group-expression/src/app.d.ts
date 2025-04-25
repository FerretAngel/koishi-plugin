declare namespace GroupExpression {
  interface Command {
    addFaceCommand: string
    deleteFaceCommand: string
    searchFaceCommand: string
  }
  interface Config {
    baseDir: string
    ctx: import('@koishijs/core').Context
    adminList: string[]
    command: Command
    keyLimitLength: number
    debounceTime: number
    addFaceTimeout: number
    selfId: string
    pageSize: number
  }
  interface FromUser {
    card: string;
    nickname: string;
    user_id: number;
  }

  interface TextFace {
    type: 'text'
    text: string
    from_user: FromUser;
  }
  interface ImageFace {
    type: 'image'
    url: string
    from_user: FromUser;
    local: string;
    file?: string;
    asface?: boolean;
  }
  type MessageContent = [TextFace] | [ImageFace]
  interface MessageJson {
    [key: string]: MessageContent[];
  }
}