export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) throw new Error((await response.text()).slice(0, 300));
  return response.json() as Promise<T>;
}

export function json(method: string, data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) };
}
