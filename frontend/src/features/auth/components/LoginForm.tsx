import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/common/Button'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { FormField } from '@/components/common/FormField'
import { useLoginMutation } from '@/features/auth/api/authApi'
import { getApiErrorMessage } from '@/utils/errors'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').min(6, 'Password must be at least 6 characters.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const [login, { isLoading, error }] = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    await login(values).unwrap()
  })

  return (
    <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)} noValidate>
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <FormField
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        error={errors.password?.message}
        {...register('password')}
      />

      <ErrorMessage message={getApiErrorMessage(error, '')} />

      <Button type="submit" size="lg" isLoading={isLoading} disabled={!isValid || isLoading} leftIcon={<LockKeyhole className="size-4" />}>
        Sign in
      </Button>
    </form>
  )
}
