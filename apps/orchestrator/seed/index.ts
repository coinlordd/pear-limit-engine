import { logger, redis } from '../src/services'

generate()

async function generate() {
  const amount = 1000
  const baseRatio = 0.67
  const variance = 0.05
  const precision = 10000

  logger.info(
    `Generating ${amount * 2} mock orders at base ratio of ${baseRatio} with a ${variance * 100}% variance...`
  )

  const count = Array.from({ length: amount })

  await Promise.all(
    count.flatMap(async (_, index) => {
      const randomVariance = (Math.random() - 0.5) * 2 * variance
      const lowerRatio = Math.round((baseRatio - Math.abs(randomVariance)) * precision) / precision
      const upperRatio = Math.round((baseRatio + Math.abs(randomVariance)) * precision) / precision

      return [
        await redis.addLimitOrder({
          id: `below-${index}-${lowerRatio}`,
          pairId: 'A:B',
          ratio: lowerRatio,
          trigger: 'below',
        }),
        await redis.addLimitOrder({
          id: `above-${index}-${upperRatio}`,
          pairId: 'A:B',
          ratio: upperRatio,
          trigger: 'above',
        }),
      ]
    })
  )

  logger.info(`Successfully seeded ${count.length * 2} mock orders`)

  const orders = await redis.listLimitOrderValues('A:B')
  logger.info(`Found ${orders.length} orders in the database`)
}
