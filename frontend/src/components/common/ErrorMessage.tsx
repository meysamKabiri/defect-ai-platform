import { AlertCircle } from 'lucide-react'

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="flex items-center gap-2 text-sm font-medium text-danger">
      <AlertCircle className="size-4" />
      {message}
    </p>
  )
}
