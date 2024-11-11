import { h, Session } from 'koishi'
import { getGroupJson, addGroupJson, updateGroupJson, useConfig } from './config'
import { deleteImage, saveBase642Image, saveImage } from './file'
type User = Session['event']['user']
interface AddTextFaceParams {
  user: User
  group_id: string
  elements: h[],
}
const creatFaceItem = async ({ user, elements, group_id }: AddTextFaceParams): Promise<GroupExpression.MessageContent> => {
  const [img] = h.select(elements, 'img')
  const [image] = h.select(elements, 'image')
  const [text] = h.select(elements, 'text')
  if (img) {
    const url = img.attrs.src
    const local = await saveImage(url, group_id)
    return [{
      type: 'image',
      file: local,
      url: local,
      local,
      from_user: {
        card: user.name,
        nickname: user.name,
        user_id: Number(user.id)
      },
    }]
  } else if (image) {
    const local = saveBase642Image(image.attrs.src, group_id)
    return [{
      type: 'image',
      file: local,
      url: local,
      local,
      from_user: {
        card: user.name,
        nickname: user.name,
        user_id: Number(user.id)
      },
    }]
  } else if (text) {
    return [{
      type: 'text',
      text: text.attrs.content,
      from_user: {
        card: user.name,
        nickname: user.name,
        user_id: Number(user.id)
      },
    }]
  }
  throw new Error('获取表情失败，请重试！')
}


interface AddFaceParams {
  elements: h[],
  key: string
  user: User,
  group_id: string
}

export const addFace = async ({ elements, user, group_id, key }: AddFaceParams) => {
  const groupJson = getGroupJson(group_id)
  const item = await creatFaceItem({ elements, user, group_id })
  if (!Array.isArray(groupJson[key])) {
    groupJson[key] = []
  }
  groupJson[key].push(item)
  updateGroupJson(group_id, groupJson)
}
interface DeleteFaceParams {
  group_id: string
  user: User
  key: string
  index: number
}
export const deleteFace = async ({ group_id, key, index, user }: DeleteFaceParams) => {
  const config = useConfig()
  const groupJson = getGroupJson(group_id)
  const list = groupJson[key]
  if (!list || index < 0 || index > list.length - 1) {
    throw new Error('表情不存在')
  }
  const [item] = list[index]
  if (!item) {
    throw new Error('表情不存在')
  }
  if (!(!item.from_user.user_id || item.from_user.user_id === Number(user.id) || config.adminList.includes(user.id.toString()))) {
    throw new Error('无权限删除表情')
  }
  if (item.type === 'image') {
    deleteImage(item.local)
  }
  groupJson[key].splice(index, 1)
  updateGroupJson(group_id, groupJson)
}

interface SearchFaceParams {
  group_id: string
  key: string
}
export const searchFace = async ({ group_id, key }: SearchFaceParams) => {
  const groupJson = getGroupJson(group_id)
  return groupJson[key] ?? []
}
