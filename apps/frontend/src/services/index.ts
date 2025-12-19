const server_url = import.meta.env.VITE_SERVER_URL as string

export const post = async <P, T>(
  route: string,
  data: P,
  timeout?: number | null,
): Promise<T> => {
  const jwt = ''
  let res = null
  try {
    res = await fetch(`${server_url}${route}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'content-type': 'application/json;charset=utf-8',
        'Accept-Encoding': 'gzip',
        jwt: jwt,
      },
      signal: AbortSignal.timeout(timeout || 20000),
      credentials: 'include'
    })
  } catch (er) {
    throw new Error('Error')
  }
  if (!res) {
    throw new Error('Error')
  }
  if (res.status >= 200 && res.status < 300) {
    const jsonData = await res.json()
    return jsonData as T
  }
  throw new Error('Failed')
}
