import fs from 'node:fs'
import path from 'node:path'
import { useConfig } from './config'
import { logger } from './log'
import { name as APP_NAME } from '.'
const miaoBaseUrl = './data/face/'

export const getFilePath = (...paths: string[]) => {
  const config = useConfig()
  const filePath = path.resolve(config.baseDir, 'data', APP_NAME, ...paths)
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true })
  }
  return filePath
}

export const readImage2base64 = (filePath: string) => {
  if (filePath.startsWith(miaoBaseUrl)) {
    filePath = filePath.replace(miaoBaseUrl, '')
  }
  const buffer = fs.readFileSync(path.resolve(getFilePath('face'), ...filePath.split('/')))
  return buffer.toString('base64')
}

export const deleteImage = (filePath: string) => {
  if (filePath.startsWith(miaoBaseUrl)) {
    filePath = filePath.replace(miaoBaseUrl, '')
  }
  fs.unlinkSync(path.resolve(getFilePath('face'), ...filePath.split('/')))
}

export const saveBase642Image = (base64: string, groupId: string = 'global') => {
  // 移除可能存在的base64头部数据
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  const fileType = base64.split(';').shift()?.split('/').pop() ?? 'png'
  const fileName = `${groupId}_${Date.now()}.${fileType}`
  const filePath = path.resolve(getFilePath('face', groupId), fileName)
  fs.writeFileSync(filePath, buffer)
  return miaoBaseUrl + groupId + '/' + fileName
}

export const saveImage = (url: string, groupId: string = 'global') => {
  return new Promise<string>(async (resolve, reject) => {
    const respose = await fetch(url)
    // 获取响应头的content-type
    const contentType = respose.headers.get('content-type')
    const imageType = contentType?.split('/')?.pop() ?? 'png'
    const buffer = await respose.arrayBuffer()
    const fileName = `${groupId}_${Date.now()}.${imageType}`
    const filePath = path.resolve(getFilePath('face', groupId), fileName)
    fs.writeFileSync(filePath, Buffer.from(buffer))
    resolve(miaoBaseUrl + groupId + '/' + fileName)
  })
}

export const saveJson = (json: GroupExpression.MessageJson, groupId: string = 'global') => {
  const filePath = path.resolve(getFilePath('textJson'), `${groupId}.json`)
  fs.writeFileSync(filePath, JSON.stringify(json))
}


export const initJson = () => {
  const filePath = path.resolve(getFilePath('textJson'))
  // 读取所有json文件
  const files = fs.readdirSync(filePath)
  // 初始化结果对象
  const result = new Map<string, GroupExpression.MessageJson>()
  // 遍历所有json文件
  files.forEach(file => {
    // 只处理 .json 文件
    if (file.endsWith('.json')) {
      const groupId = file.replace('.json', '')
      try {
        // 读取并解析json文件
        const content = fs.readFileSync(path.resolve(filePath, file), 'utf-8')
        result.set(groupId, JSON.parse(content))
      } catch (error) {
        logger.error(`Failed to read json file: ${file}`, error)
      }
    }
  })
  return result
}