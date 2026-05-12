#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const ROOT = process.cwd()
const TARGET_REGEX = /[\\/]@puppeteer[\\/]browsers[\\/]lib[\\/]cjs[\\/]CLI\.js$/
const SEARCH_ROOTS = [
  path.join(ROOT, 'node_modules'),
]
const YARGS_IMPORT_REGEX = /require\((['"])yargs\/yargs\1\)/g

function walk(dir, found) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(absPath, found)
      continue
    }
    if (entry.isFile() && TARGET_REGEX.test(absPath)) {
      found.push(absPath)
    }
  }
}

function patchFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const output = source.replace(YARGS_IMPORT_REGEX, 'require("yargs")')
  if (output === source) return false
  fs.writeFileSync(filePath, output, 'utf8')
  return true
}

const targets = []
for (const root of SEARCH_ROOTS) {
  walk(root, targets)
}

if (targets.length === 0) {
  console.log('[patch-puppeteer-yargs] no target files found, skip.')
  process.exit(0)
}

let patchedCount = 0
for (const file of targets) {
  try {
    if (patchFile(file)) {
      patchedCount += 1
      console.log(`[patch-puppeteer-yargs] patched: ${path.relative(ROOT, file)}`)
    }
  } catch (error) {
    console.error(`[patch-puppeteer-yargs] failed: ${file}`)
    console.error(error)
    process.exitCode = 1
  }
}

if (patchedCount === 0) {
  console.log('[patch-puppeteer-yargs] already up-to-date.')
} else {
  console.log(`[patch-puppeteer-yargs] done. patched ${patchedCount} file(s).`)
}
