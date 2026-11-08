export type Configuration = {
  demoSignInEnabled: boolean
  inboundPhone: string
  inboundEmail: string
  phoneEnabled: boolean
  emailEnabled: boolean
  reportChatEnabled: boolean
  openaiModel: string
  reportChatPrompt: string
  openaiKeyStatus: 'not-set' | 'saved' | 'unavailable'
  secureKeyStorageAvailable: boolean
}
