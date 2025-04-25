import { Context, Schema } from "koishi"
import { initJson, saveJson } from "./file"

export const SchemaConfig: Schema<Omit<GroupExpression.Config, 'baseDir' | 'ctx'>> = Schema.intersect([
  Schema.object({
    command: Schema.object({
      addFaceCommand: Schema.string().default('#添加表情').description('添加表情命令'),
      deleteFaceCommand: Schema.string().default('#删除表情').description('删除表情命令'),
      searchFaceCommand: Schema.string().default('#搜索表情').description('搜索表情命令'),
    }).collapse().description('指令注册设置'),
    keyLimitLength: Schema.number().default(256).description('关键字长度限制'),
    debounceTime: Schema.number().default(2).description('两次触发间隔时间(秒)'),
    addFaceTimeout: Schema.number().default(60).description('添加表情超时时间(秒)'),
    selfId: Schema.string().description('当前登录的QQ号'),
    adminList: Schema.array(Schema.string()).description('管理员列表'),
    pageSize: Schema.number().default(2).description('每页显示表情数量'),
  })
])

let globalConfig: GroupExpression.Config | undefined
let groupJsonMap: Map<string, GroupExpression.MessageJson> | undefined
export const initConfig = (ctx: Context, config: GroupExpression.Config) => {
  globalConfig = {
    baseDir: ctx.baseDir,
    ctx,
    ...config,
  }
  groupJsonMap = initJson()
  return globalConfig
}
export const useConfig = () => {
  if (!globalConfig) {
    throw new Error('GroupExpression config is not initialized')
  }
  return globalConfig
}

export const getGroupJson = (groupId: string = 'global') => {
  if (!groupJsonMap) {
    throw new Error('GroupExpression config is not initialized')
  }
  return groupJsonMap.get(groupId) ?? {}
}

export const addGroupJson = (groupId: string, groupJson: GroupExpression.MessageJson) => {
  if (!groupJsonMap) {
    throw new Error('GroupExpression config is not initialized')
  }
  groupJsonMap.set(groupId, groupJson)
  saveJson(groupJson, groupId)
}
export const updateGroupJson = (groupId: string, groupJson: GroupExpression.MessageJson) => {
  if (!groupJsonMap) {
    throw new Error('GroupExpression config is not initialized')
  }
  groupJsonMap.set(groupId, groupJson)
  saveJson(groupJson, groupId)
}
