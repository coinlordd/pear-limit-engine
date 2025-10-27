import { execSync } from 'child_process'
import { Command } from 'commander'
import { logger } from '../logger.js'

const program = new Command()

program.name('db-cli').description('Database migration CLI tool').version('1.0.0')

program.description('Show migration status').action(() => {
  try {
    logger.info('Checking migration status...')
    execSync('bunx --bun typeorm migration:show -d src/data-source.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
  } catch (error) {
    logger.error('Failed to check migration status', { error })
  }
})

program.parse()
