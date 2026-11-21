import { Box, Typography } from '@mui/material'
import { lifted } from './surface'
import type { ChatMessage } from '@/services/llmApi'
import { visuallyHidden } from '@/utils/a11y'

/** Text with ``` fenced blocks shown as code; everything else keeps its line breaks. */
function Content({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/```[\w-]*\n?/)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Box key={i} component="pre" sx={{ m: '8px 0', p: 1.5, borderRadius: '12px', bgcolor: mine ? 'rgba(11, 20, 55, 0.07)' : 'background.default', overflowX: 'auto', fontSize: 14 }}>
            <code>{part.replace(/\n$/, '')}</code>
          </Box>
        ) : (
          part && (
            <Typography key={i} component="span" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>
              {part}
            </Typography>
          )
        ),
      )}
    </>
  )
}

export function Message({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <Box component="li" sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <Box
        sx={[
          { maxWidth: { xs: '92%', sm: '78%' }, minWidth: 0, px: 2, py: 1.5, borderRadius: '20px' },
          mine ? lifted : { bgcolor: 'background.paper', color: 'text.primary' },
        ]}
      >
        <Box component="span" sx={visuallyHidden}>
          {mine ? 'Você: ' : 'IA: '}
        </Box>
        <Content text={message.content} mine={mine} />
      </Box>
    </Box>
  )
}
