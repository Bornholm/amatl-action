import * as core from '@actions/core'
import {
  installAmatl,
  findMarkdownFiles,
  processMarkdownFiles,
  validateInputs,
  type AmatlOptions
} from './amatl.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const options: AmatlOptions = {
      patterns: core.getInput('patterns'),
      ignore: core.getInput('ignore'),
      outputDir: core.getInput('output-dir'),
      format: core.getInput('format'),
      layout: core.getInput('layout') || undefined,
      vars: core.getInput('vars') || undefined,
      version: core.getInput('amatl-version'),
      config: core.getInput('config') || undefined,
      additionalArgs: core.getInput('additional-args') || undefined
    }

    core.info('Starting amatl markdown processing...')
    core.info(`Patterns: ${options.patterns.split('\n').join(', ')}`)
    core.info(`Output directory: ${options.outputDir}`)
    core.info(`Format: ${options.format}`)
    core.info(`Layout: ${options.layout || 'default'}`)
    core.info(`Variables: ${options.vars || 'none'}`)
    core.info(`Config: ${options.config || 'default'}`)
    core.info(`Additional Args: ${options.additionalArgs || 'none'}`)
    core.info(`Amatl version: ${options.version}`)

    // Validate inputs
    validateInputs(options)

    // Install amatl
    const amatLPath = await installAmatl(options.version)

    // Find markdown files
    const markdownFiles = await findMarkdownFiles(
      options.patterns,
      options.ignore
    )

    if (markdownFiles.length === 0) {
      core.warning('No markdown files found matching the patterns')
      core.setOutput('files-processed', '0')
      core.setOutput('output-files', '[]')
      return
    }

    // Process markdown files
    const result = await processMarkdownFiles(amatLPath, markdownFiles, options)

    // Set outputs
    core.setOutput('files-processed', result.filesProcessed.toString())
    core.setOutput('output-files', JSON.stringify(result.outputFiles))

    core.info(`Successfully processed ${result.filesProcessed} files`)
    core.info(`Generated ${result.outputFiles.length} output files`)

    // Log output files
    for (const file of result.outputFiles) {
      core.info(`Generated: ${file}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}
