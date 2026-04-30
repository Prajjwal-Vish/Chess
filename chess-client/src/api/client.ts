const BASE_URL = 'http://localhost:3001'

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 204 No Content — don't try to parse JSON
  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong')
  }

  return data as T
}