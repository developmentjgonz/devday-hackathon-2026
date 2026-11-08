import type { SessionUser } from '../shared/types/auth.ts'

export type Bindings = WorkerBindings & {
  LOCAL_TEST_SIGN_IN?: string
  APP_ORIGIN?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_ADMIN_EMAIL?: string
  GOOGLE_REDIRECT_URI?: string
  DEMO_ADMIN_CODE?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: { user: SessionUser }
}
