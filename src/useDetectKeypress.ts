import { useState, useEffect, useCallback } from 'react';

// Detect a "magic word" typed anywhere in the app (e.g. "pizza", "resoconto").
//
// Two independent buffers feed the match:
// - keydown events: physical keyboards, work even with no input focused;
// - beforeinput events: on-screen/virtual keyboards and IME composition,
//   where keydown often reports "Unidentified" and carries no character.
// Matching is case-insensitive so Caps Lock, Shift or a tablet's
// auto-capitalization can't silently break the shortcuts.
const useDetectKeypress = (word: string, callback: () => void) => {
  const [keyBuffer, setKeyBuffer] = useState("")
  const [inputBuffer, setInputBuffer] = useState("")

  // Fire the callback in an effect rather than during render: invoking a
  // parent's setState while this hook renders triggers React's "Cannot update a
  // component while rendering a different component" error and makes the
  // shortcuts unreliable.
  useEffect(() => {
    const target = word.toLowerCase()
    if (keyBuffer === target || inputBuffer.endsWith(target)) {
      callback()
      setKeyBuffer("")
      setInputBuffer("")
    }
  }, [keyBuffer, inputBuffer, word, callback])

  const onKeyDown = useCallback((event: any) => {
    if (!event.key) return
    if (event.altKey) return
    if (event.ctrlKey) return
    if (event.metaKey) return
    if (event.key.length !== 1) return

    setKeyBuffer(buffer => (buffer + event.key.toLowerCase()).slice(-word.length))
  }, [word.length])

  const onBeforeInput = useCallback((event: any) => {
    // insertCompositionText carries the whole composition so far on each
    // keystroke; appending and keeping the tail still ends with the full word.
    if (event.inputType !== "insertText" && event.inputType !== "insertCompositionText") return
    if (!event.data) return

    setInputBuffer(buffer => (buffer + event.data.toLowerCase()).slice(-word.length))
  }, [word.length])

  useEffect(() => {
    // Capture phase: a component calling stopPropagation on keydown must not
    // be able to disable the shortcuts.
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("beforeinput", onBeforeInput, true)

    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("beforeinput", onBeforeInput, true)
    }
  }, [onKeyDown, onBeforeInput])
}

export default useDetectKeypress;
