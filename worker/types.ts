import type { SessionUser } from '../shared/types/auth.ts'

export type Bindings = WorkerBindings & {
  LOCAL_TEST_SIGN_IN?: string
  APP_ORIGIN?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: { user: SessionUser }
}
