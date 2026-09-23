import { apiFetch } from './api'

export function login(nombre, password) {
  return apiFetch('/api/Auth/login', { method: 'POST', body: { nombre, password } })
}

export async function getProductos(token) {
  const list = await apiFetch('/api/Productos', { token })
  return Array.isArray(list) ? list : []
}

export function getProducto(token, id) {
  return apiFetch(`/api/Productos/${id}`, { token })
}

export function createProducto(token, formData) {
  return apiFetch('/api/Productos', { method: 'POST', token, body: formData })
}

export function updateProducto(token, id, formData) {
  return apiFetch(`/api/Productos/${id}`, { method: 'PUT', token, body: formData })
}

export function deleteProducto(token, id) {
  return apiFetch(`/api/Productos/${id}`, { method: 'DELETE', token })
}

export function deleteImagen(token, url) {
  return apiFetch(`/api/Imagenes?url=${encodeURIComponent(url)}`, { method: 'DELETE', token })
}

function nombreForm(nombre) {
  const fd = new FormData()
  fd.append('nombre', nombre)
  return fd
}

export function getCategorias(token) {
  return apiFetch('/api/Categorias', { token })
}

export function createCategoria(token, nombre) {
  return apiFetch('/api/Categorias', { method: 'POST', token, body: nombreForm(nombre) })
}

export function updateCategoria(token, id, nombre) {
  return apiFetch(`/api/Categorias/${id}`, { method: 'PUT', token, body: nombreForm(nombre) })
}

export function deleteCategoria(token, id) {
  return apiFetch(`/api/Categorias/${id}`, { method: 'DELETE', token })
}

export function getMarcas(token) {
  return apiFetch('/api/Marcas', { token })
}

export function createMarca(token, nombre) {
  return apiFetch('/api/Marcas', { method: 'POST', token, body: { nombre } })
}

export function updateMarca(token, id, nombre) {
  return apiFetch(`/api/Marcas/${id}`, { method: 'PUT', token, body: { nombre } })
}

export function deleteMarca(token, id) {
  return apiFetch(`/api/Marcas/${id}`, { method: 'DELETE', token })
}

export function getAdministradores(token) {
  return apiFetch('/api/Administradores', { token })
}

export function createAdministrador(token, nombre, password) {
  return apiFetch('/api/Administradores', { method: 'POST', token, body: { nombre, password } })
}

export function updateAdministrador(token, id, nombre, password) {
  return apiFetch(`/api/Administradores/${id}`, {
    method: 'PUT',
    token,
    body: password ? { nombre, password } : { nombre },
  })
}

export function deleteAdministrador(token, id) {
  return apiFetch(`/api/Administradores/${id}`, { method: 'DELETE', token })
}