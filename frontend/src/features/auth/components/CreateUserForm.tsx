import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/common/Button'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { FormField } from '@/components/common/FormField'
import { useCreateUserMutation } from '@/features/auth/api/authApi'
import { getApiErrorMessage } from '@/utils/errors'

const createUserSchema = z
  .object({
    full_name: z.string().trim().max(255, 'Name must be 255 characters or less.').optional(),
    email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type CreateUserFormValues = z.infer<typeof createUserSchema>

export function CreateUserForm() {
  const [createUser, { isLoading, error }] = useCreateUserMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirmPassword, full_name, ...values }) => {
    await createUser({
      ...values,
      full_name: full_name?.trim() || null,
    }).unwrap()
  })

  return (
    <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)} noValidate>
      <FormField
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Production admin"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

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

      <ErrorMessage message={getApiErrorMessage(error, '')} />

      <Button type="submit" size="lg" isLoading={isLoading} disabled={!isValid || isLoading} leftIcon={<UserPlus className="size-4" />}>
        Create first user
      </Button>
    </form>
  )
}
