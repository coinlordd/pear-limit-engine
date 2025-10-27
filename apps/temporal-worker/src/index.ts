import { Worker } from '@temporalio/worker'
import { logger } from './logger'

async function main() {
  logger.info('Starting Temporal Worker...')
  const worker = await Worker.create({
    workflowsPath: new URL('./workflows', import.meta.url).pathname,
    activitiesPath: new URL('./activities', import.meta.url).pathname,
    taskQueue: 'default-task-queue',
  })
  logger.info('Worker created, starting...')
  await worker.run()
}

main().catch((error) => logger.error('Fatal error:', { error }))
