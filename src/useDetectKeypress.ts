import { useState, useEffect, useCallback } from 'react';

const useDetectKeypress = (string: string, callback: () => void) => {
  const [something, setSomething] = useState("")

  // Fire the callback in an effect rather than during render: invoking a
  // parent's setState while this hook renders triggers React's "Cannot update a
  // component while rendering a different component" error and makes the
  // shortcuts unreliable.
  useEffect(() => {
    if (something === string) {
      callback()
      setSomething("")
    }
  }, [something, string, callback])

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
