import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { FormField } from '@/components/common/FormField'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAcceptInvitationMutation } from '@/features/auth/api/authApi'
import { getApiErrorMessage } from '@/utils/errors'

const acceptInvitationSchema = z
  .object({
    full_name: z.string().trim().max(255, 'Name must be 255 characters or less.').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [acceptInvitation, { isLoading, error }] = useAcceptInvitationMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirmPassword, full_name, password }) => {
    await acceptInvitation({
      token,
      full_name: full_name?.trim() || null,
      password,
    }).unwrap()
  })

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Defect AI Platform</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Accept workspace invitation</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create your account credentials to join the invited workspace.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-border/80 bg-surface/95 p-6 shadow-card sm:p-8">
          <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)} noValidate>
            <FormField
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Jane Engineer"
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <FormField
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a secure password"
              error={errors.password?.message}
              {...register('password')}
            />

            <FormField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {!token && <ErrorMessage message="This invitation link is missing a token." />}
            <ErrorMessage message={getApiErrorMessage(error, '')} />

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              disabled={!token || !isValid || isLoading}
              leftIcon={<KeyRound className="size-4" />}
            >
              Accept invitation
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
