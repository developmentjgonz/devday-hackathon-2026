import { authRequest } from '@/features/auth/auth'
import type { AiInput, ChannelsInput } from '../../../shared/schemas/configuration'
import type { Configuration } from '../../../shared/types/configuration'

export interface ConfigurationStore {
  read(signal?: AbortSignal): Promise<Configuration>
  saveChannels(input: ChannelsInput): Promise<Configuration>
  saveAi(input: AiInput): Promise<Configuration>
  removeAiKey(): Promise<Configuration>
  setDemoAccess(enabled: boolean): Promise<Configuration>
}

export const databaseConfiguration: ConfigurationStore = {
  read: (signal) => authRequest('/api/configuration', { signal }),
  saveChannels: (input) => authRequest('/api/configuration/channels', { method: 'POST', body: JSON.stringify(input) }),
  saveAi: (input) => authRequest('/api/configuration/ai', { method: 'POST', body: JSON.stringify(input) }),
  removeAiKey: () => authRequest('/api/configuration/ai-key/remove', { method: 'POST' }),
  setDemoAccess: (enabled) => authRequest('/api/configuration/demo-access', { method: 'POST', body: JSON.stringify({ enabled }) }),
}
