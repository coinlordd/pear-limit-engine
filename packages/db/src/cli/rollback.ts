import { execSync } from 'child_process'
import { Command } from 'commander'
import { logger } from '../logger.js'

const program = new Command()

program.name('db-cli').description('Database migration CLI tool').version('1.0.0')

program.description('Revert the last migration').action(() => {
  try {
    logger.info('Reverting last migration...')
    execSync('bunx --bun typeorm migration:revert -d src/data-source.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    logger.info('Migration reverted successfully!')
  } catch (error) {
    logger.error('Failed to revert migration', { error })
  }
})

program.parse()
