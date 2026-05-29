import { useState } from 'react'
import { AuthHero } from '@/features/auth/components/AuthHero'
import { AuthPanel } from '@/features/auth/components/AuthPanel'
import type { AuthMode } from '@/features/auth/components/AuthModeTabs'

type AuthPageProps = {
  initialMode?: AuthMode
}

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:h-screen lg:grid-cols-[minmax(0,1fr)_31rem] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_34rem]">
      <AuthHero />
      <AuthPanel mode={mode} onModeChange={setMode} />
    </main>
  )
}
