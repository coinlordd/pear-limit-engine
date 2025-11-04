import { z } from 'zod'

const BookLevelSchema = z.object({
  px: z.string(),
  sz: z.string(),
  n: z.number(),
})

export const OrderbookResponseSchema = z.object({
  coin: z.string(),
  levels: z.tuple([z.array(BookLevelSchema), z.array(BookLevelSchema)]),
  time: z.number(),
})

export type BookLevel = z.infer<typeof BookLevelSchema>

export type OrderbookResponse = z.infer<typeof OrderbookResponseSchema>

export type IncomingMessage = {
  channel: 'l2Book'
  data: OrderbookResponse
}
