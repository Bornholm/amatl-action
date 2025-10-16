import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as path from 'path'
import { glob } from 'glob'
import stringArgv from 'string-argv'
import * as os from 'os'

export interface AmatlOptions {
  patterns: string
  ignore: string
  outputDir: string
  format: string
  layout?: string
  vars?: string
  version: string
  config?: string
  additionalArgs?: string
}

export interface ProcessResult {
  filesProcessed: number
  outputFiles: string[]
}

/**
 * Install amatl tool
 */
export async function installAmatl(version: string): Promise<string> {
  core.info(`Installing amatl version: ${version}`)

  // Check if amatl is already installed and cached
  let toolPath = tc.find('amatl', version)
  if (toolPath) {
    core.info(`Found cached amatl at ${toolPath}`)
    return path.join(toolPath, 'amatl')
  }

  // Determine platform and architecture
  const platform = process.platform
  const arch = process.arch

  let osName: string
  let archName: string

  switch (platform) {
    case 'linux':
      osName = 'linux'
      break
    case 'darwin':
      osName = 'darwin'
      break
    case 'win32':
      osName = 'windows'
      break
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }

  switch (arch) {
    case 'x64':
      archName = 'amd64'
      break
    case 'arm64':
      archName = 'arm64'
      break
    default:
      throw new Error(`Unsupported architecture: ${arch}`)
  }

  // Get the latest version if 'latest' is specified
  let actualVersion = version
  if (version === 'latest') {
    actualVersion = await getLatestAmatlVersion()
  }

  // Download amatl
  const downloadUrl = `https://github.com/Bornholm/amatl/releases/download/${actualVersion}/amatl_${actualVersion.replace('v', '')}_${osName}_${archName}.tar.gz`
  core.info(`Downloading amatl from: ${downloadUrl}`)

  const downloadPath = await tc.downloadTool(downloadUrl)
  const extractedPath = await tc.extractTar(downloadPath, undefined, 'xz')

  // Cache the tool
  toolPath = await tc.cacheDir(extractedPath, 'amatl', actualVersion)

  const binaryPath = path.join(
    toolPath,
    platform === 'win32' ? 'amatl.exe' : 'amatl'
  )

  // Make binary executable on Unix systems
  if (platform !== 'win32') {
    await exec.exec('chmod', ['+x', binaryPath])
  }

  core.info(`amatl installed successfully at ${binaryPath}`)
  return binaryPath
}

/**
 * Get the latest version of amatl from GitHub releases
 */
async function getLatestAmatlVersion(): Promise<string> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/Bornholm/amatl/releases/latest'
    )
    const data = (await response.json()) as { tag_name: string }
    return data.tag_name
  } catch (error) {
    core.warning(`Failed to get latest version, using v0.25.1: ${error}`)
    return 'v0.25.1'
  }
}

/**
 * Find markdown files matching the pattern
 */
export async function findMarkdownFiles(
  patterns: string,
  ignore: string
): Promise<string[]> {
  const files: string[] = []

  const workspace = process.env.GITHUB_WORKSPACE as string
  const ignoredFiles = new Set(ignore.split('\n'))

  for (const pattern of patterns.split('\n')) {
    core.info(`Searching for markdown files with pattern: ${pattern}`)
    let matches = await glob(pattern, {
      ignore: ['node_modules/**', '.git/**'],
      nodir: true
    })

    matches = matches.filter((m) => {
      const relPath = path.relative(workspace, m)
      const ignored = ignoredFiles.has(relPath)
      if (ignored) {
        core.info(`Ignoring markdown file '${relPath}'`)
        return false
      }

      return true
    })

    files.push(...matches)
  }

  core.info(`Found ${files.length} markdown files`)
  return files
}

/**
 * Process markdown files with amatl
 */
export async function processMarkdownFiles(
  amatlPath: string,
  files: string[],
  options: AmatlOptions
): Promise<ProcessResult> {
  const outputFiles: string[] = []
  let filesProcessed = 0

  // Ensure output directory exists
  await io.mkdirP(options.outputDir)

  const batch: Promise<ProcessResult>[] = []
  let batchSize: number = os.cpus().length - 1
  if (batchSize < 1) batchSize = 1

  for (const file of files) {
    if (batch.length < batchSize) {
      batch.push(processMarkdownFile(amatlPath, file, options))
      continue
    } else {
      const results = await Promise.all(batch)
      for (const result of results) {
        outputFiles.push(...result.outputFiles)
        filesProcessed += result.filesProcessed
      }
      batch.length = 0
    }
  }

  if (batch.length > 0) {
    const results = await Promise.all(batch)
    for (const result of results) {
      outputFiles.push(...result.outputFiles)
      filesProcessed += result.filesProcessed
    }
  }

  return {
    filesProcessed,
    outputFiles
  }
}

export async function processMarkdownFile(
  amatlPath: string,
  file: string,
  options: AmatlOptions
): Promise<ProcessResult> {
  const outputFiles: string[] = []

  core.info(`Processing: ${file}`)

  const baseName = path.basename(file, path.extname(file))
  const relativePath = path.relative(process.cwd(), file)
  const outputSubDir = path.join(options.outputDir, path.dirname(relativePath))

  // Ensure subdirectory exists
  await io.mkdirP(outputSubDir)

  // Process for each requested format
  const formats = options.format
    .toLowerCase()
    .split(',')
    .map((f) => f.trim())

  for (const format of formats) {
    const outputFile = path.join(
      outputSubDir,
      `${baseName}.${format === 'markdown' ? 'md' : format}`
    )
    const args = ['render']

    if (options.config) {
      args.push('-c', options.config)
    }

    args.push(format, '-o', outputFile)

    // Add layout option for HTML and PDF
    if ((format === 'html' || format === 'pdf') && options.layout) {
      args.push('--html-layout', options.layout)
    }

    // Add variables file if provided
    if (options.vars) {
      args.push('--vars', options.vars)
    }

    if (options.additionalArgs) {
      const additionalArgs = stringArgv(options.additionalArgs)
      args.push(...additionalArgs)
    }

    // Add input file
    args.push(file)

    try {
      await exec.exec(amatlPath, args)
      outputFiles.push(outputFile)
      core.info(`Generated: ${outputFile}`)
    } catch (error) {
      core.error(`Failed to process ${file} to ${format}: ${error}`)
      throw error
    }
  }

  return {
    filesProcessed: 1,
    outputFiles
  }
}

/**
 * Validate inputs
 */
export function validateInputs(options: AmatlOptions): void {
  if (!options.patterns) {
    throw new Error('Patterns is required')
  }

  if (!options.outputDir) {
    throw new Error('Output directory is required')
  }

  // Validate each format
  const formats = options.format
    .toLowerCase()
    .split(',')
    .map((f) => f.trim())

  for (const format of formats) {
    if (!['html', 'pdf', 'markdown'].includes(format)) {
      throw new Error(
        `Invalid format: ${format}. Supported formats: html, pdf, markdown, both`
      )
    }
  }
}
