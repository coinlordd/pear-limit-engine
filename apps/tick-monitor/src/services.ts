import { RedisClient } from '@pear/redis'
import { createLogger } from '@pear/logger'
import { Config } from './config'

export const logger = createLogger('tick-monitor')

export const redis = new RedisClient(Config.REDIS_URL, Config.REDIS_PREFIX)
