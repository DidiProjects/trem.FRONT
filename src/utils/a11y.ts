/**
 * Read by screen readers, not shown. Sizes in px strings: in `sx`, a number up to 1 is a
 * fraction, so `width: 1` would be 100% and stretch the page from wherever it sits.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const
