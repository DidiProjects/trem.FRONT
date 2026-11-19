import { useState } from 'react'
import { PasswordField } from '@/components/PasswordField'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { pdfApi } from '@/services/pdfApi'
import { DOCS, PDF_ACCEPT } from './paths'

export default function UnlockPage() {
  const [password, setPassword] = useState('')

  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF protegido aqui"
      dropHint="Você precisa saber a senha atual: o trem não quebra senhas."
      options={<PasswordField label="Senha atual do PDF" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />}
      blocker={() => (!password ? 'Informe a senha atual.' : null)}
      runLabel={() => 'Tirar a senha'}
      run={async ([file]) => ({ file: await pdfApi.unlock(file, password) })}
      chain={[DOCS.merge, DOCS.select, DOCS.text]}
      onReset={() => setPassword('')}
    />
  )
}
