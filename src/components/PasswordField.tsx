import { useState, type KeyboardEvent } from 'react'
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

type Props = Omit<TextFieldProps, 'type'>

/** Password input with a show/hide toggle and a Caps Lock warning. */
export function PasswordField({ helperText, onKeyUp, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    setCapsLock(event.getModifierState?.('CapsLock') ?? false)
    onKeyUp?.(event)
  }

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      onKeyUp={handleKey}
      helperText={helperText ?? (capsLock ? 'Caps Lock está ativado' : undefined)}
      slotProps={{
        ...props.slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setVisible((v) => !v)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                size="small"
              >
                {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
