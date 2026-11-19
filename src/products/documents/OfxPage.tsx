import { useState } from 'react'
import { MenuItem, TextField, Typography } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { pdfApi, type AccountType } from '@/services/pdfApi'
import { PDF_ACCEPT } from './paths'

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'CHECKING', label: 'Conta corrente' },
  { value: 'SAVINGS', label: 'Poupança' },
  { value: 'CREDITCARD', label: 'Cartão de crédito' },
]

export default function OfxPage() {
  const [type, setType] = useState<AccountType>('CHECKING')
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')

  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o extrato em PDF"
      dropHint="O PDF original baixado do app ou site do banco. Foto ou digitalização não funciona."
      options={
        <>
          <TextField select label="Tipo de conta" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Código do banco (opcional)"
            placeholder="0000"
            value={bank}
            onChange={(e) => setBank(e.target.value.replace(/\D/g, ''))}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
          />
          <TextField
            label="Número da conta (opcional)"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 30 } }}
          />
          <Typography variant="body2" color="text.secondary">
            Os campos opcionais só identificam a conta no app financeiro.
          </Typography>
        </>
      }
      runLabel={() => 'Gerar OFX'}
      run={async ([file]) => ({ file: await pdfApi.toOfx(file, bank || '0000', account.trim() || '0000000000', type) })}
    />
  )
}
