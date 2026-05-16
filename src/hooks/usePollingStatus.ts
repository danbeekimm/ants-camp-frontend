import { useState, useEffect, useRef } from 'react'

/**
 * 일정 간격으로 fetcher를 호출하다가 isTerminal(value)이 true가 되면 중단한다.
 * fetcher / isTerminal은 마운트 시점에 캡처되므로 안정적인 레퍼런스를 넘겨야 한다.
 */
export function usePollingStatus<T>(
  fetcher: () => Promise<T>,
  isTerminal: (value: T) => boolean,
  intervalMs = 3000,
): { value: T | null; error: string | null } {
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const v = await fetcher()
        if (!mountedRef.current) return
        setValue(v)
        if (!isTerminal(v)) {
          timer = setTimeout(poll, intervalMs)
        }
      } catch (e: any) {
        if (!mountedRef.current) return
        setError(e?.message ?? '오류가 발생했습니다.')
      }
    }

    poll()

    return () => {
      mountedRef.current = false
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { value, error }
}