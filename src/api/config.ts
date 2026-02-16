const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '4c796308c96c6aab786630b7adddfbdd6a85bb439ba4a6eafc619d925d179ca8'

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/+$/, '')
}

export function getApiToken(): string {
  return API_TOKEN
}

