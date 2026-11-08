import type { SessionUser } from '../shared/types/auth.ts'

export type Bindings = WorkerBindings & {
  LOCAL_TEST_SIGN_IN?: string
  APP_ORIGIN?: string
  CONFIG_ENCRYPTION_KEY?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: { user: SessionUser }
}
