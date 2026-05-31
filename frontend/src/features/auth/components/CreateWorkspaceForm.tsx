import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/common/Button'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { FormField } from '@/components/common/FormField'
import { useCreateWorkspaceMutation } from '@/features/auth/api/authApi'
import { getApiErrorMessage } from '@/utils/errors'

const createWorkspaceSchema = z
  .object({
    workspace_name: z.string().trim().min(2, 'Workspace name is required.').max(255, 'Workspace name is too long.'),
    owner_full_name: z.string().trim().max(255, 'Name must be 255 characters or less.').optional(),
    owner_email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

export function CreateWorkspaceForm() {
  const [createWorkspace, { isLoading, error }] = useCreateWorkspaceMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: 'onChange',
    defaultValues: {
      workspace_name: '',
      owner_full_name: '',
      owner_email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirmPassword, owner_full_name, ...values }) => {
    await createWorkspace({
      ...values,
      owner_full_name: owner_full_name?.trim() || null,
    }).unwrap()
  })

  return (
    <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)} noValidate>
      <FormField
        label="Company / Workspace Name"
        type="text"
        autoComplete="organization"
        placeholder="ABC Manufacturing"
        error={errors.workspace_name?.message}
        {...register('workspace_name')}
      />

      <FormField
        label="Owner Name"
        type="text"
        autoComplete="name"
        placeholder="Production owner"
        error={errors.owner_full_name?.message}
        {...register('owner_full_name')}
      />

      <FormField
        label="Owner Email"
        type="email"
        autoComplete="email"
        placeholder="owner@company.com"
        error={errors.owner_email?.message}
        {...register('owner_email')}
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

      <Button type="submit" size="lg" isLoading={isLoading} disabled={!isValid || isLoading} leftIcon={<Building2 className="size-4" />}>
        Create Workspace
      </Button>
    </form>
  )
}
