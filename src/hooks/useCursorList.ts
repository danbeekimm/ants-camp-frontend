import { useState, useEffect, useCallback, useRef } from 'react'
import type { CursorPage } from '@/services/assistantApi'

interface ListState<T> {
  items: T[]
  hasNext: boolean
  loading: boolean
  error: string | null
}

/**
 * 커서 기반 페이징 훅.
 * fetcher 레퍼런스가 바뀌면(파라미터 변경) 자동으로 목록을 초기화하고 재조회한다.
 * 호출부에서 useCallback으로 fetcher를 메모이제이션해야 한다.
 */
export function useCursorList<T>(fetcher: (cursor?: string) => Promise<CursorPage<T>>) {
  const [state, setState] = useState<ListState<T>>({
    items: [], hasNext: false, loading: true, error: null,
  })
  const nextCursorRef = useRef<string | null>(null)
  // loadMore에서 항상 최신 fetcher를 참조하기 위한 ref
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher })

  // fetcher가 바뀔 때마다 초기 로드
  useEffect(() => {
    let cancelled = false
    setState({ items: [], hasNext: false, loading: true, error: null })
    nextCursorRef.current = null

    fetcher()
      .then((page) => {
        if (cancelled) return
        setState({ items: page.items, hasNext: page.hasNext, loading: false, error: null })
        nextCursorRef.current = page.nextCursor
      })
      .catch((e: any) => {
        if (cancelled) return
        setState({ items: [], hasNext: false, loading: false, error: e?.message ?? '오류가 발생했습니다.' })
      })

    return () => { cancelled = true }
  }, [fetcher])

  const loadMore = useCallback(() => {
    const cursor = nextCursorRef.current
    if (!cursor) return
    setState((s) => ({ ...s, loading: true }))
    fetcherRef.current(cursor)
      .then((page) => {
        setState((s) => ({
          items: [...s.items, ...page.items],
          hasNext: page.hasNext,
          loading: false,
          error: null,
        }))
        nextCursorRef.current = page.nextCursor
      })
      .catch((e: any) => {
        setState((s) => ({ ...s, loading: false, error: e?.message ?? '오류가 발생했습니다.' }))
      })
  }, [])

  return { ...state, loadMore }
}