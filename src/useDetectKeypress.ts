import { useState, useEffect, useCallback } from 'react';

const useDetectKeypress = (string: string, callback: () => void) => {
  const [something, setSomething] = useState("")
  if (something === string) {
    callback()
    setSomething("")
  }
  const onKeyDown = useCallback((event: any) => {
    if (!event.key) return
    if (event.altKey) return
    if (event.ctrlKey) return
    if (event.metaKey) return
    if (event.shiftKey) return
    if (event.key.length !== 1) return

    setSomething(something => (something + event.key).slice(-string.length))
  }, [setSomething, string.length])

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown, false)

    return () => {
      document.removeEventListener("keydown", onKeyDown, false)
    }
  }, [onKeyDown])
}

export default useDetectKeypress;
