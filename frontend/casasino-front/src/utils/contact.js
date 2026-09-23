export const WHATSAPP_NUMBER = '5493471505442'

export const INSTAGRAM_URL = 'https://www.instagram.com/casaninotortugas/'

export function whatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function productWhatsappMessage(producto) {
  const code = producto.codigo ? ` código: ${producto.codigo}` : ''
  return `Hola! Quería consultar por ${producto.nombre}${code}`
}

export function brandWhatsappUrl(marcaNombre) {
  return whatsappUrl(`Hola! Quería consultar por la marca ${marcaNombre}`)
}