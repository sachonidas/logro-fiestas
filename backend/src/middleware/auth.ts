import type { MiddlewareHandler } from 'hono'

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
  const key = c.req.header('x-api-key')
  if (!key || key !== process.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}
