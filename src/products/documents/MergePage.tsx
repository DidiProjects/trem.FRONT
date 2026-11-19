import { useState } from 'react'
import { TextField } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX, baseName } from '@/services/filesApi'
import { pdfApi } from '@/services/pdfApi'
import { formatBytes } from '@/utils/text'
import { DOCS, PDF_ACCEPT } from './paths'

export default function MergePage() {
  const [name, setName] = useState('')

  return (
    <FileTool
      accept={PDF_ACCEPT}
      multiple
      maxBytes={PDF_MAX}
      dropTitle="Solte os PDFs aqui"
      dropHint={`Dois ou mais arquivos, até ${formatBytes(PDF_MAX)} cada.`}
      options={
        <TextField
          label="Nome do arquivo final"
          placeholder="documentos-juntos"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="Sem preencher, usa o nome do primeiro arquivo."
        />
      }
      blocker={(files) => (files.length < 2 ? 'Adicione pelo menos 2 arquivos.' : null)}
      runLabel={(files) => (files.length < 2 ? 'Juntar' : `Juntar ${files.length} arquivos`)}
      run={async (files) => {
        const final = `${baseName(name.trim()) || `${baseName(files[0].name)}-juntos`}.pdf`
        return { file: await pdfApi.merge(files, final) }
      }}
      chain={[DOCS.protect, DOCS.select, DOCS.text]}
      onReset={() => setName('')}
    />
  )
}
