import { RedisClient } from '@pair/redis'

const REDIS_PREFIX = process.env.REDIS_PREFIX ?? ''

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) throw new Error('REDIS_URL is not set')

export const redis = new RedisClient(REDIS_URL, REDIS_PREFIX)
