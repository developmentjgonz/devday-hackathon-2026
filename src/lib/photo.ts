import { photoMaxBytes } from '../../shared/schemas/photo'

export const maxSourcePhotoBytes = 10 * 1024 * 1024
export async function preparePhoto(file: File): Promise<{ mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }> {
  let image: Blob = file
  if (file.size > photoMaxBytes) {
    const url = URL.createObjectURL(file)
    try {
      const source = new Image()
      source.src = url
      await source.decode()
      let scale = Math.min(1, 1600 / Math.max(source.naturalWidth, source.naturalHeight))
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not process photo')
      for (let attempt = 0; attempt < 5; attempt++) {
        canvas.width = Math.max(1, Math.round(source.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(source.naturalHeight * scale))
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(source, 0, 0, canvas.width, canvas.height)
        const resized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
        if (!resized) throw new Error('Could not process photo')
        image = resized
        if (image.size <= photoMaxBytes) break
        scale *= 0.75
      }
      if (image.size > photoMaxBytes) throw new Error('Could not make photo small enough')
    } finally { URL.revokeObjectURL(url) }
  }
  const result = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read photo'))
    reader.onerror = () => reject(new Error('Could not read photo'))
    reader.readAsDataURL(image)
  })
  return { mimeType: image.type as 'image/jpeg' | 'image/png' | 'image/webp', data: result.slice(result.indexOf(',') + 1) }
}
