import { execSync } from 'child_process'
import { Command } from 'commander'
import { logger } from '../logger.js'

const program = new Command()

program.name('db-cli').description('Database migration CLI tool').version('1.0.0')

program.description('Run pending migrations to the database').action(() => {
  try {
    logger.info('Running migrations...')
    execSync('bunx --bun typeorm migration:run -d src/data-source.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    logger.info('Migrations completed successfully!')
  } catch (error) {
    logger.error('Failed to run migrations', { error })
  }
})

program.parse()
