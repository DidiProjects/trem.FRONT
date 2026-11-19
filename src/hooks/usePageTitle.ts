import { useEffect } from 'react'

/** The tab title, which is also what screen readers announce on navigation. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · trem` : 'trem'
  }, [title])
}
