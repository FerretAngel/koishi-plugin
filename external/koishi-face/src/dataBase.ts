import { Context, h } from "koishi"

const TABLEKEY = 'groupFace'

declare module 'koishi' {
  interface Tables {
    groupFace: Face
  }
}

interface Face {
  id: number
  key: string
  type: 'text' | 'img'
  createrId: string
  groupId: string
  value: string
  enable: boolean
}
interface CreateFace extends Omit<Face, 'id' | 'enable'> {
}

export const useFaceDataBase = (ctx: Context) => {
  ctx.model.extend(TABLEKEY, {
    id: 'unsigned',
    key: 'string',
    type: 'string',
    createrId: 'string',
    groupId: 'string',
    value: 'text',
    enable: 'boolean'
  })
  const getItem = async (key: string, groupId: string) => {
    return await ctx.database.get(TABLEKEY, {
      groupId,
      key,
      enable: true
    })
  }
  const queryItem = async (params: Partial<Omit<Face, 'enable' | 'value'>>) => {
    return await ctx.database.get(TABLEKEY, {
      ...params,
      enable: true
    })
  }
  const addItem = (item: CreateFace) => {
    return ctx.database.create(TABLEKEY, {
      ...item,
      id: Date.now(),
      enable: true,
    })
  }
  const deleteItem = (id: number) => {
    return ctx.database.set(TABLEKEY, id, {
      enable: false
    })
  }
  return {
    getItem,
    addItem,
    queryItem,
    deleteItem
  }
}
