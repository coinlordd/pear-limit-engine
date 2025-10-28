if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set')

export const Config = {
  REDIS_PREFIX: process.env.REDIS_PREFIX ?? '',
  REDIS_URL: process.env.REDIS_URL,
  VERBOSE: process.env.VERBOSE === 'true',
}
