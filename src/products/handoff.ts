/**
 * Files carried from one screen to the next tool (a drop on Home, "continue with this
 * file"). In memory only: a reload starts the tool empty, which is the honest state.
 */
let pending: { path: string; files: File[] } | null = null
let timer: ReturnType<typeof setTimeout> | undefined

export const handoff = {
  give(path: string, files: File[]) {
    clearTimeout(timer)
    pending = { path, files }
  },

  /**
   * The files left for this route. They stay readable for a moment, because StrictMode
   * runs state initializers twice, and then are dropped.
   */
  take(path: string): File[] {
    if (!pending || pending.path !== path) return []
    const { files } = pending
    clearTimeout(timer)
    timer = setTimeout(() => {
      pending = null
    }, 1000)
    return files
  },
}
