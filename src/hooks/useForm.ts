import { useState, type ChangeEvent } from 'react'
import type { ZodType } from 'zod'
import { validate, type Errors } from '@/utils/validation'

/**
 * Field state with zod. A field shows its error once it was left (blur) or the form
 * was submitted, and then updates as the user types. Errors from the API (by field)
 * show until that field changes.
 */
export function useForm<T extends Record<string, string>>(initial: T, schema: ZodType) {
  const [values, setValues] = useState<T>(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Errors>({})

  const clientErrors = validate(schema, values) ?? {}

  const errorOf = (name: keyof T & string): string | undefined =>
    serverErrors[name] ?? (submitted || touched[name] ? clientErrors[name] : undefined)

  const setValue = (name: keyof T & string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setServerErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const field = (name: keyof T & string) => {
    const error = errorOf(name)
    return {
      name,
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(name, event.target.value),
      onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
      error: Boolean(error),
      helperText: error,
    }
  }

  /** Marks the form submitted; true when every field is valid. */
  const check = (): boolean => {
    setSubmitted(true)
    return Object.keys(clientErrors).length === 0
  }

  return { values, field, setValue, check, setServerErrors, errorOf }
}
