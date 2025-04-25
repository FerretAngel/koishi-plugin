import fs from 'node:fs'
import path from 'node:path'
import { useConfig } from './config'
import { name as APP_NAME } from '.'
const getFilePath = (...paths: string[]) => {
  const { baseDir } = useConfig()
  const filePath = path.resolve(baseDir, 'data', APP_NAME, 'expression', ...paths)
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true })
  }
  return filePath
}



export const getRadomExpressionBase64 = (key: string) => {
  const filePath = getFilePath(key)
  const files = fs.readdirSync(filePath)
  if (files.length === 0) return ''
  const randomFile = files[Math.floor(Math.random() * files.length)]
  return fs.readFileSync(path.resolve(filePath, randomFile)).toString('base64')
}

export const getExpressionList = () => {
  const filePath = getFilePath()
  return fs.readdirSync(filePath)
}

export const addExpression = (key: string, url: string) => {
  return new Promise<string>(async (resolve, reject) => {
    const respose = await fetch(url)
    // 获取响应头的content-type
    const contentType = respose.headers.get('content-type')
    const imageType = contentType?.split('/')?.pop() ?? 'png'
    const buffer = await respose.arrayBuffer()
    const fileName = `${key}_${Date.now()}.${imageType}`
    const filePath = path.resolve(getFilePath(key), fileName)
    fs.writeFileSync(filePath, Buffer.from(buffer))
    resolve(fileName)
  })
}
export const addExpressionBase64 = (key: string, base64: string) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  const fileType = base64.split(';').shift()?.split('/').pop() ?? 'png'
  const fileName = `${key}_${Date.now()}.${fileType}`
  const filePath = path.resolve(getFilePath(key), fileName)
  fs.writeFileSync(filePath, buffer)
  return fileName
}


export const getExpressionListByKey = (key: string) => {
  const filePath = getFilePath(key)
  return fs.readdirSync(filePath)
}

export const deleteExpression = (key: string, fileName: string) => {
  const filePath = getFilePath(key, fileName)
  fs.unlinkSync(filePath)
}

export const getExpressionBase64 = (key: string, fileName: string) => {
  console.log(key, fileName)
  const filePath = getFilePath(key, fileName)
  const fileType = fileName.split('.').pop() ?? 'png'
  return `data:image/${fileType};base64,${fs.readFileSync(filePath).toString('base64')}`
}
