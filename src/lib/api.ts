import { getToken } from "./auth"

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  skipAuth?: boolean
}

export interface ApiErrorData {
  status: number
  statusText: string
  data: unknown
  message: string
}

function createApiError(status: number, statusText: string, data: unknown, message: string): ApiErrorData {
  return { status, statusText, data, message }
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(endpoint, API_BASE_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }
  return url.toString()
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth = false, headers = {}, ...fetchOptions } = options
  
  const url = buildUrl(endpoint, params)
  
  const authHeaders: Record<string, string> = {}
  if (!skipAuth) {
    const token = await getToken()
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`
    }
  }
  
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders,
  }
  
  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  }
  
  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body)
  }
  
  try {
    const response = await fetch(url, config)
    
    const contentType = response.headers.get("content-type")
    const isJson = contentType?.includes("application/json")
    const data = isJson ? await response.json() : await response.text()
    
    if (!response.ok) {
      throw createApiError(
        response.status,
        response.statusText,
        data,
        isJson && data && typeof data === "object" && "message" in data ? String(data.message) : `HTTP error ${response.status}`
      )
    }
    
    return data as T
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      throw error
    }
    throw createApiError(0, "Network Error", null, error instanceof Error ? error.message : "Unknown error")
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "GET" }),
  
  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "POST", body: data as BodyInit }),
  
  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "PUT", body: data as BodyInit }),
  
  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "PATCH", body: data as BodyInit }),
  
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "DELETE" }),
  
  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) => 
    request<T>(endpoint, { 
      ...options, 
      method: "POST", 
      body: formData,
      headers: {
        ...options?.headers,
      },
    }),
}