import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Trade } from './entities/Trade.js'
import { logger } from './logger.js'

const dbHost = process.env.DB_HOST
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined
const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS
const dbName = process.env.DB_NAME

if (!dbHost || !dbPort || !dbUser || !dbPass || !dbName) {
  throw new Error('Missing database configuration')
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbHost,
  port: dbPort,
  username: dbUser,
  password: dbPass,
  database: dbName,
  entities: [Trade],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
})

export async function initDb() {
  logger.info('Connecting to Postgres...')
  await AppDataSource.initialize()
  logger.info('Connected.')
}
