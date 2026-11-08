export type Configuration = {
  inboundPhone: string
  inboundEmail: string
  openaiModel: string
  openaiKeyStatus: 'not-set' | 'saved' | 'unavailable'
  secureKeyStorageAvailable: boolean
}
