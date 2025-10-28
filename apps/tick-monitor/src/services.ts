import { RedisClient } from '@pair/redis'
import { createLogger } from '@pair/logger'
import { Config } from './config'

export const logger = createLogger('tick-monitor')

export const redis = new RedisClient(Config.REDIS_URL, Config.REDIS_PREFIX)
