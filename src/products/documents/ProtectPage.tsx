import { useState } from 'react'
import { Typography } from '@mui/material'
import { PasswordField } from '@/components/PasswordField'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { pdfApi } from '@/services/pdfApi'
import { DOCS, PDF_ACCEPT } from './paths'

export default function ProtectPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && confirm !== password

  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF aqui"
      options={
        <>
          <PasswordField label="Senha para abrir" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <PasswordField
            label="Repita a senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={mismatch}
            helperText={mismatch ? 'As senhas não são iguais.' : undefined}
          />
          <Typography variant="body2" color="text.secondary">
            Guarde a senha: sem ela, nem o trem consegue abrir o arquivo de novo.
          </Typography>
        </>
      }
      blocker={() => (!password ? 'Escolha uma senha.' : confirm !== password ? 'Repita a mesma senha.' : null)}
      runLabel={() => 'Proteger PDF'}
      run={async ([file]) => ({ file: await pdfApi.protect(file, password) })}
      chain={[DOCS.merge]}
      onReset={() => {
        setPassword('')
        setConfirm('')
      }}
    />
  )
}
