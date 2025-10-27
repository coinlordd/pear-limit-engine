import path from 'path'
import { glob } from 'glob'
import inquirer from 'inquirer'
import { Command } from 'commander'
import { execSync } from 'child_process'
import { logger } from '../logger.js'

const program = new Command()

program.name('db-cli').description('Database migration CLI tool').version('1.0.0')

program.description('Generate a migration for a specific entity file').action(async () => {
  try {
    // Find all entity files
    const entityFiles = await glob('src/entities/*.ts', { cwd: process.cwd() })

    if (entityFiles.length === 0) {
      logger.warn('No entity files found in src/entities/')
      return
    }

    // Ask user to select which entity needs a migration
    const { selectedEntity } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedEntity',
        message: 'Which entity file needs a migration?',
        choices: entityFiles.map((file) => ({
          name: path.basename(file, '.ts'),
          value: file,
        })),
      },
    ])

    // Ask for migration name
    const { migrationName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'migrationName',
        message: 'Enter migration name:',
        default: `Update${path.basename(selectedEntity, '.ts')}`,
        validate: (input) => {
          if (!input.trim()) {
            return 'Migration name is required'
          }
          return true
        },
      },
    ])

    // Generate migration
    logger.info(`Generating migration for ${selectedEntity}...`)

    const migrationCommand = `bunx --bun typeorm migration:generate src/migrations/${migrationName} -d src/data-source.ts`

    try {
      execSync(migrationCommand, {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
      logger.info(`Migration '${migrationName}' generated successfully!`)
    } catch (error) {
      logger.error('Failed to generate migration', { error })
    }
  } catch (error) {
    logger.error('Error', { error })
  }
})

program.parse()
