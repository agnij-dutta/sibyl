const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type FetchOptions = RequestInit & {
  json?: unknown;
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: 'include',
    body: json ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      data?.error || response.statusText,
      data
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  get: <T = unknown>(path: string, options?: FetchOptions) =>
    fetchApi<T>(path, { ...options, method: 'GET' }),

  post: <T = unknown>(path: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(path, { ...options, method: 'POST', json: data }),

  patch: <T = unknown>(path: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(path, { ...options, method: 'PATCH', json: data }),

  delete: <T = unknown>(path: string, options?: FetchOptions) =>
    fetchApi<T>(path, { ...options, method: 'DELETE' }),
};

export { ApiError };
