import type { InputHTMLAttributes } from 'react'
import { Input } from './Input'
import { ErrorMessage } from './ErrorMessage'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function FormField({ label, id, error, ...props }: FormFieldProps) {
  const inputId = id ?? props.name

  return (
    <label className="grid gap-2" htmlFor={inputId}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <Input id={inputId} hasError={Boolean(error)} {...props} />
      <ErrorMessage message={error} />
    </label>
  )
}
