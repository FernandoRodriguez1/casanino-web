import { ApiError, API_BASE } from './api'

export function uploadFormData(path, { method = 'POST', token, formData, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${API_BASE}${path}`, true)
    xhr.responseType = 'text'
    xhr.timeout = 180000

    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }

    xhr.onload = () => {
      const body = parseBody(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(1)
        resolve(body)
        return
      }
      reject(new ApiError(xhr.status, body?.message || `Error ${xhr.status}`))
    }

    xhr.onerror = () => reject(new ApiError(0, 'No se pudo conectar con el servidor'))
    xhr.ontimeout = () => reject(new ApiError(0, 'El servidor tardó demasiado en responder'))
    xhr.onabort = () => reject(new ApiError(0, 'Subida cancelada'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(formData)
  })
}

function parseBody(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
