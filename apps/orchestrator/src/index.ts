import { RatioValue } from '@pear/shared'
import { logger, redis } from './services'
import { StreamProcessor } from './processor'

logger.info('Service starting...')

async function main() {
  await redis.subscribe({
    channel: 'ratio',
    handler: (value: RatioValue) => StreamProcessor.onMessage(value),
  })

  logger.info('Subscribed to ratio channel')
}

main().catch((error) => logger.error('Fatal error:', { error }))
