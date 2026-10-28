"use client"

import * as React from "react"

const COARSE_POINTER_QUERY = "(pointer: coarse)"

/**
 * True on touch-first devices, where a long press belongs to the browser's text
 * selection gesture. Width alone is a poor signal (a narrow window on a desktop
 * still has a fine pointer), so this checks pointer capabilities instead.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(COARSE_POINTER_QUERY)
    const onChange = () => setCoarse(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return coarse
}
