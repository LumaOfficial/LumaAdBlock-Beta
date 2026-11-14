#!/usr/bin/env node
/**
 * Packs the built extension/ folder into the zip a store accepts.
 *
 * The archive has manifest.json at its root (no wrapping folder), carries no
 * source maps or editor junk, and is checked against the manifest before it is
 * written so a broken package never reaches an upload form.
 */
import { crc32, deflateRawSync } from 'node:zlib'
import { readFile, readdir, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'extension')
// Kept outside dist/ so the upload artifact itself is tracked and downloadable.
const outDir = path.join(root, 'release')

const SKIP = /(^|\/)(\.DS_Store|Thumbs\.db|node_modules|\.git)(\/|$)|\.map$/
const REQUIRED = [
  'manifest.json',
  'background.js',
  'content.js',
  'youtube.js',
  'luma-defaults.json',
  'app/index.html',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
]

async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name
    if (SKIP.test(relative)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full, relative)))
    else if (entry.isFile()) files.push({ relative, full })
  }
  return files
}

function dosDateTime(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = (date.getFullYear() - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/** Minimal ZIP writer: one local header + central directory + end record. */
function zip(files) {
  const chunks = []
  const central = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.relative, 'utf8')
    const data = file.data
    const packed = deflateRawSync(data, { level: 9 })
    const { time, day } = dosDateTime(file.mtime)
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)

    chunks.push(local, name, packed)

    const entry = Buffer.alloc(46)
    entry.writeUInt32LE(0x02014b50, 0)
    entry.writeUInt16LE(20, 4)
    entry.writeUInt16LE(20, 6)
    entry.writeUInt16LE(0x0800, 8)
    entry.writeUInt16LE(8, 10)
    entry.writeUInt16LE(time, 12)
    entry.writeUInt16LE(day, 14)
    entry.writeUInt32LE(crc, 16)
    entry.writeUInt32LE(packed.length, 20)
    entry.writeUInt32LE(data.length, 24)
    entry.writeUInt16LE(name.length, 28)
    entry.writeUInt16LE(0, 30)
    entry.writeUInt16LE(0, 32)
    entry.writeUInt16LE(0, 34)
    entry.writeUInt16LE(0, 36)
    entry.writeUInt32LE(0, 38)
    entry.writeUInt32LE(offset, 42)
    central.push(entry, name)

    offset += local.length + name.length + packed.length
  }

  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...chunks, directory, end])
}

async function main() {
  const manifestPath = path.join(source, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

  if (manifest.version !== pkg.version) {
    throw new Error(
      'manifest version ' + manifest.version + ' does not match package.json ' + pkg.version,
    )
  }
  if (manifest.name.length > 45) throw new Error('manifest name is longer than 45 characters')
  if (String(manifest.description || '').length > 132) {
    throw new Error('manifest description is longer than the 132 characters stores allow')
  }
  if (!/^\d+(\.\d+){1,3}$/.test(manifest.version)) {
    throw new Error('manifest version must be 1 to 4 dot-separated numbers')
  }

  const files = await walk(source)
  const names = new Set(files.map((file) => file.relative))
  for (const required of REQUIRED) {
    if (!names.has(required)) throw new Error('the package is missing ' + required)
  }
  for (const resource of manifest.declarative_net_request?.rule_resources || []) {
    if (!names.has(resource.path)) throw new Error('the package is missing ruleset ' + resource.path)
  }
  for (const script of manifest.content_scripts || []) {
    for (const js of script.js || []) {
      if (!names.has(js)) throw new Error('the package is missing content script ' + js)
    }
  }

  const packed = []
  let rawBytes = 0
  for (const file of files) {
    const data = await readFile(file.full)
    rawBytes += data.length
    packed.push({ relative: file.relative, data, mtime: (await stat(file.full)).mtime })
  }

  await mkdir(outDir, { recursive: true })
  const target = path.join(outDir, 'luma-ad-blocker-' + manifest.version + '.zip')
  const archive = zip(packed)
  await writeFile(target, archive)

  console.log('Packed ' + packed.length + ' files (' + (rawBytes / 1024).toFixed(0) + ' KB) into:')
  console.log('  ' + path.relative(root, target))
  console.log('  ' + (archive.length / 1024).toFixed(0) + ' KB · manifest.json at the archive root')
  console.log('  Luma ' + manifest.version + ' · rules: ' +
    (manifest.declarative_net_request?.rule_resources || []).map((item) => item.id).join(', '))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
