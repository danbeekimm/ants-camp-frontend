import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import koI18n from '@emoji-mart/data/i18n/ko.json'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import {
  createSession,
  getSessions,
  getMessages,
  sendMessage,
  getPublicDocument,
  DOC_TYPE_LABEL,
  type ChatMessage,
  type ChatSession,
  type DocumentDetail,
  type DocType,
} from '@/services/assistantApi'

interface Source {
  knowledgeDocumentId: string
  title: string
  docType: string
}

interface Message {
  id: string
  role: 'USER' | 'BOT'
  content: string
  sources?: Source[] | null
  createdAt: string
  thinkingSeconds?: number
}


export function ChatBot() {
  const { isLoggedIn } = useAuthStore()
  const { isDark } = useThemeStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'chat' | 'sessions'>('chat')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionKeyword, setSessionKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [sessionHasNext, setSessionHasNext] = useState(false)
  const [sessionNextCursor, setSessionNextCursor] = useState<string | null>(null)
  const [sessionLoadingMore, setSessionLoadingMore] = useState(false)
  // 챗봇 영역 내부에 띄우는 출처 문서 팝업 모달 (챗봇 패널/화면 밖으로 새지 않도록 absolute 로 가둠)
  const [sourceDocId, setSourceDocId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const emojiBtnRef    = useRef<HTMLButtonElement>(null)
  const emojiPickRef   = useRef<HTMLDivElement>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  // 플로팅 버튼 부속: 토스 스타일 풍선 + 미확인 배지
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  // open 의 최신 값을 비동기 콜백(handleSend)에서 참조하기 위한 ref
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
    // 챗봇을 열면 미확인 표시 해제
    if (open && hasUnread) setHasUnread(false)
  }, [open, hasUnread])

  // 닫혀있을 때만 5초 사이클로 풍선 노출(visible 3s + hidden 2s)
  useEffect(() => {
    if (open) { setTooltipVisible(false); return }
    let timer: ReturnType<typeof setTimeout>
    let visible = false
    const cycle = () => {
      visible = !visible
      setTooltipVisible(visible)
      timer = setTimeout(cycle, visible ? 3000 : 2000)
    }
    // 첫 노출까지 1.5초 대기
    timer = setTimeout(cycle, 1500)
    return () => clearTimeout(timer)
  }, [open])

  // 버튼·피커 모두 바깥 클릭 시 닫기
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      const inBtn  = emojiBtnRef.current?.contains(t)
      const inPick = emojiPickRef.current?.contains(t)
      if (!inBtn && !inPick) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 피커 열고 닫을 때 최신 메시지로 스크롤
  useEffect(() => { scrollToBottom() }, [showEmoji, scrollToBottom])

  // ※ emoji-mart picker 는 :host { height: 435px } 자연 높이로 두고
  //   wrapper 가 그보다 크기만 하면 내부 scroll/category tab 이 정상 동작한다.
  //   강제 height 오버라이드는 내부 ResizeObserver/좌표 계산을 깨뜨려 빼두었다.

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, scrollToBottom])

  // 외부에서 chatbot:open 이벤트로 열기 + 프롬프트 자동 입력
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt ?? ''
      setOpen(true)
      setView('chat')
      if (prompt) setInput(prompt)
    }
    window.addEventListener('chatbot:open', handler)
    return () => window.removeEventListener('chatbot:open', handler)
  }, [])

  // 세션 초기화 (채팅창 열릴 때 1회)
  useEffect(() => {
    if (!open || !isLoggedIn || sessionId) return

    const init = async () => {
      setInitializing(true)
      try {
        const page = await getSessions()
        if (page.items.length > 0) {
          const latest = page.items[0]
          setSessionId(latest.chatSessionId)
          const msgs = await getMessages(latest.chatSessionId)
          setMessages(toMessages(msgs))
        }
      } catch {
        // 실패 시 첫 메시지 전송 때 세션 생성
      } finally {
        setInitializing(false)
      }
    }
    init()
  }, [open, isLoggedIn, sessionId])

  // 로그아웃 시 즉시 초기화
  useEffect(() => {
    if (!isLoggedIn) {
      setOpen(false)
      setView('chat')
      setSessionId(null)
      setMessages([])
      setSessions([])
      setInput('')
      setSessionKeyword('')
      setDebouncedKeyword('')
      setSessionHasNext(false)
      setSessionNextCursor(null)
      setSourceDocId(null)
    }
  }, [isLoggedIn])

  // keyword debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(sessionKeyword), 300)
    return () => clearTimeout(t)
  }, [sessionKeyword])

  // view가 sessions로 전환되거나 debouncedKeyword가 바뀔 때 목록 재조회
  useEffect(() => {
    if (view !== 'sessions' || !isLoggedIn) return
    let cancelled = false
    setSessionsLoading(true)
    setSessions([])
    setSessionHasNext(false)
    setSessionNextCursor(null)
    getSessions({ keyword: debouncedKeyword || undefined })
      .then((page) => {
        if (cancelled) return
        setSessions(page.items)
        setSessionHasNext(page.hasNext)
        setSessionNextCursor(page.nextCursor)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSessionsLoading(false) })
    return () => { cancelled = true }
  }, [view, debouncedKeyword, isLoggedIn])

  const handleOpenSessions = () => {
    if (!isLoggedIn) return
    setSessionKeyword('')
    setDebouncedKeyword('')
    setView('sessions')
  }

  const handleLoadMoreSessions = async () => {
    if (!sessionNextCursor || sessionLoadingMore) return
    setSessionLoadingMore(true)
    try {
      const page = await getSessions({
        keyword:       debouncedKeyword || undefined,
        lastUpdatedAt: sessionNextCursor,
      })
      setSessions((prev) => [...prev, ...page.items])
      setSessionHasNext(page.hasNext)
      setSessionNextCursor(page.nextCursor)
    } catch { /* ignore */ } finally {
      setSessionLoadingMore(false)
    }
  }

  const handleSelectSession = async (sid: string) => {
    if (!isLoggedIn) return
    setView('chat')
    setSessionId(sid)
    setInitializing(true)
    try {
      const msgs = await getMessages(sid)
      setMessages(toMessages(msgs))
    } catch { /* ignore */ } finally {
      setInitializing(false)
    }
  }

  const handleNewChat = async () => {
    if (!isLoggedIn) return
    setView('chat')
    setMessages([])
    setSessionId(null)
    try {
      const session = await createSession()
      setSessionId(session.chatSessionId)
    } catch { /* 첫 메시지 전송 시 재시도 */ }
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending || !isLoggedIn) return

    setInput('')
    resetTextareaHeight()

    const tempId = `u-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'USER', content, createdAt: new Date().toISOString() },
    ])
    setSending(true)
    const startedAt = Date.now()

    try {
      let sid = sessionId
      if (!sid) {
        const session = await createSession()
        setSessionId(session.chatSessionId)
        sid = session.chatSessionId
      }
      const botMsg = await sendMessage(sid, content)
      const thinkingSeconds = Math.round((Date.now() - startedAt) / 1000)
      setMessages((prev) => [
        ...prev,
        {
          id: botMsg.chatMessageId,
          role: 'BOT',
          content: botMsg.content,
          sources: botMsg.sources,
          createdAt: botMsg.createdAt,
          thinkingSeconds,
        },
      ])
      // 답변 도착 시점에 챗봇이 닫혀있으면 → 미확인 빨간 점 표시
      if (!openRef.current) setHasUnread(true)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'BOT',
          content: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          createdAt: new Date().toISOString(),
        },
      ])
      if (!openRef.current) setHasUnread(true)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    // IME composing 중(한글 등) 이면 Enter 가 마지막 글자 commit 용도이므로 전송 보류.
    // nativeEvent.isComposing(modern) 또는 keyCode 229(legacy) 둘 다 확인.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    handleSend()
  }

  // IME(한글) 조합 중에는 onChange 가 호출돼도 조합 문자가 input state 에 들어가지 않는
  // 케이스가 있어 전송 버튼이 disabled 인 상태로 남았다. compositionEnd 에서 textarea 의
  // 실제 값으로 명시적으로 동기화해 disabled 조건이 항상 최신값을 보도록 보장한다.
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    const v = e.currentTarget.value
    if (v !== input) setInput(v)
  }

  const handleEmojiSelect = useCallback((emoji: { native: string }) => {
    const el    = textareaRef.current
    const char  = emoji.native
    if (el) {
      const start = el.selectionStart ?? input.length
      const end   = el.selectionEnd   ?? input.length
      const next  = input.slice(0, start) + char + input.slice(end)
      setInput(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + char.length, start + char.length)
      })
    } else {
      setInput((prev) => prev + char)
    }
  }, [input])

const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      // 3줄까지만 자동 확장. 그 이상은 textarea 내부 스크롤로 처리 (max-h-[72px] 와 동기)
      el.style.height = Math.min(el.scrollHeight, 72) + 'px'
    }
  }

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  if (!isLoggedIn) return null

  return (
    <>
      {/* ── 채팅 창 ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ease-out ${
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="w-[360px] h-[620px] bg-gray-900 rounded-3xl shadow-2xl border border-gray-800/80 flex flex-col overflow-hidden relative">
          {/* 출처 문서 팝업 모달 — 챗봇 패널 내부에 absolute 로 가둬 화면 밖으로 새지 않도록 함 */}
          {sourceDocId && (
            <SourceModal
              documentId={sourceDocId}
              onClose={() => setSourceDocId(null)}
              onMore={() => {
                const id = sourceDocId
                setSourceDocId(null)
                setOpen(false)
                navigate(`/guides/${id}`)
              }}
            />
          )}
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            {view === 'sessions' ? (
              <button
                onClick={() => setView('chat')}
                className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleOpenSessions}
                className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="문의 목록"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                {view === 'sessions' ? '문의 목록' : 'AntCamp AI'}
              </p>
              <p className="text-white/60 text-[10px]">
                {view === 'sessions' ? '이전 대화를 선택하세요' : '주식 투자 도우미'}
              </p>
            </div>
            {view === 'chat' && (
              <button
                onClick={handleNewChat}
                title="새 대화"
                className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {view === 'sessions' ? (
            /* ── 세션 목록 ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 검색 — 알약형 pill + 좌측 돋보기 + 우측 클리어 */}
              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    value={sessionKeyword}
                    onChange={(e) => setSessionKeyword(e.target.value)}
                    placeholder="대화 검색"
                    className="w-full bg-gray-800/70 border border-gray-700 focus:border-indigo-500 focus:bg-gray-800 rounded-full pl-9 pr-9 py-2 text-xs text-gray-100 placeholder-gray-500 outline-none transition-colors"
                  />
                  {sessionKeyword && (
                    <button
                      type="button"
                      onClick={() => setSessionKeyword('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
                      aria-label="검색어 지우기"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pt-1 pb-2">
                {sessionsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <TypingDots />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center text-xl">💬</div>
                    <p className="text-xs text-gray-500">
                      {sessionKeyword ? '검색 결과가 없습니다.' : '이전 문의 내역이 없습니다.'}
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {sessions.map((s) => (
                      <li key={s.chatSessionId}>
                        <button
                          onClick={() => handleSelectSession(s.chatSessionId)}
                          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800/40 hover:bg-gray-800/80 hover:translate-x-0.5 transition-all border border-transparent hover:border-gray-700/80"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-500/30 flex items-center justify-center text-base flex-shrink-0 group-hover:from-indigo-500/40 group-hover:to-violet-500/40 transition-colors">
                            💭
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[13px] text-gray-100 font-medium truncate group-hover:text-indigo-200 transition-colors">
                              {s.title ?? '새 대화'}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{formatTime(s.updatedAt)}</p>
                          </div>
                          <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                    {sessionHasNext && (
                      <li>
                        <button
                          onClick={handleLoadMoreSessions}
                          disabled={sessionLoadingMore}
                          className="mt-1 w-full py-2 text-[11px] text-gray-500 hover:text-gray-200 hover:bg-gray-800/40 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          {sessionLoadingMore ? <TypingDots /> : '더 보기'}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* 새 문의하기 버튼 */}
              <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
                <button
                  onClick={handleNewChat}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  새 문의하기
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── 메시지 영역 ── */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                {initializing ? (
                  <div className="flex justify-center items-center h-full">
                    <TypingDots />
                  </div>
                ) : messages.length === 0 ? (
                  <WelcomeView />
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      onSourceClick={(id) => setSourceDocId(id)}
                    />
                  ))
                )}
                {sending && (
                  <div className="flex items-start">
                    <ThinkingIndicator />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── 이모지 피커 — 채팅 내부, 헤더 아래~입력창 위 공간 채움 ── */}
              {showEmoji && (
                <div
                  ref={emojiPickRef}
                  className="emoji-picker-wrap"
                  style={{
                    position: 'absolute',
                    top: '76px',
                    bottom: '80px',
                    left: '12px',
                    right: '12px',
                    borderRadius: '12px',
                    zIndex: 20,
                    // picker 의 자체 bg 와 동일하게 채워 검색 시 picker 가 줄어들어도 빈 공간이 어색해 보이지 않도록
                    background: isDark ? 'rgb(21, 22, 25)' : 'rgb(255, 255, 255)',
                    // picker 가 wrapper 안에 들어 있어 자체 그림자가 가려지므로 wrapper 에 elevation 적용
                    boxShadow: isDark
                      ? '0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)'
                      : '0 12px 32px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06)',
                    animation: 'pickerPop 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                >
                  <Picker
                    data={data}
                    i18n={koI18n}
                    onEmojiSelect={handleEmojiSelect}
                    theme={isDark ? 'dark' : 'light'}
                    locale="ko"
                    previewPosition="none"
                    skinTonePosition="none"
                    perLine={8}
                    maxFrequentRows={1}
                    navPosition="top"
                    emojiSize={22}
                    emojiButtonSize={32}
                    style={{
                      height: '100%',
                      border: 'none',
                      borderRadius: 0,
                      // 다크 모드
                      ...(isDark ? {
                        '--rgb-background': '21, 22, 25',    // CSS와 동일
                        '--rgb-input':      '35, 38, 45',
                        '--rgb-color':      '220, 225, 235',
                        '--rgb-accent':     '99, 102, 241',
                        '--shadow':         'none',
                      } : {
                        '--rgb-background': '255, 255, 255', // CSS와 동일
                        '--rgb-input':      '241, 245, 249',
                        '--rgb-color':      '15, 23, 42',
                        '--rgb-accent':     '99, 102, 241',
                        '--shadow':         'none',
                      }),
                    } as React.CSSProperties}
                  />
                </div>
              )}

              {/* ── 입력 — 이모지 / 입력 pill / 전송 3개 분리 ── */}
              <div className="px-4 pb-4 pt-3 border-t border-gray-800 flex-shrink-0">
                <div className="flex items-end gap-2">
                  {/* 1. 이모지 토글 — 입력 pill 과 시각적으로 분리되도록 보더 있는 동그란 버튼 */}
                  <button
                    ref={emojiBtnRef}
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border transition-colors ${
                      showEmoji
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800/60 hover:text-gray-100'
                    }`}
                    title="이모지"
                  >
                    <span className="text-base leading-none">😊</span>
                  </button>

                  {/* 2. 입력 pill — flex-1, 이모지/전송과 8px gap. 무채색 회색 대신 인디고/바이올렛 글래스 톤 */}
                  <div className="flex-1 min-w-0 bg-gradient-to-br from-indigo-500/[0.12] via-indigo-400/[0.06] to-violet-500/[0.12] border border-indigo-400/25 focus-within:border-indigo-400/70 focus-within:from-indigo-500/[0.18] focus-within:to-violet-500/[0.18] rounded-2xl px-4 min-h-[40px] flex items-center transition-colors shadow-inner shadow-indigo-500/[0.04]">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInputChange}
                      onCompositionEnd={handleCompositionEnd}
                      onKeyDown={handleKeyDown}
                      placeholder="메시지를 입력하세요..."
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none outline-none leading-tight py-2 max-h-[72px] overflow-y-auto"
                    />
                  </div>

                  {/* 3. 전송 버튼 — 독립 동그란 버튼 */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="w-10 h-10 flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
                    title="전송"
                  >
                    <SendIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 text-center mt-2 select-none">
                  Enter 전송 · Shift+Enter 줄바꿈
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 플로팅 버튼 영역 (펄스 링 + 토스 풍선 + 미확인 배지) ── */}
      <div className="fixed bottom-6 right-6 z-50 w-14 h-14">

        {/* 토스 스타일 풍선 — 버튼 좌측에 위치, 5초 사이클로 슬라이드 인/아웃 */}
        {!open && (
          <div
            className={`absolute right-full top-1/2 -translate-y-1/2 mr-3 pointer-events-none transition-all duration-300 ease-out ${
              tooltipVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}
          >
            <div className="relative bg-gray-900 text-gray-100 text-[13px] font-medium px-3.5 py-2 rounded-xl shadow-xl border border-gray-800 whitespace-nowrap">
              💬 도움이 필요하신가요?
              {/* 우측 화살표 (말풍선 꼬리) */}
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-gray-900 border-r border-t border-gray-800"
              />
            </div>
          </div>
        )}

        {/* 펄스 링 — 닫혀있을 때만 (Magic UI Pulsating 스타일) */}
        {!open && (
          <>
            <span className="absolute inset-0 rounded-full bg-indigo-500/35 animate-ping pointer-events-none" />
            <span
              className="absolute inset-0 rounded-full bg-violet-500/25 animate-ping pointer-events-none"
              style={{ animationDelay: '0.75s' }}
            />
          </>
        )}

        {/* 본 버튼 */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`relative w-14 h-14 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center ${
            open
              ? 'bg-gray-700 hover:bg-gray-600 rotate-0'
              : 'bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:scale-105'
          }`}
        >
          {open ? (
            <ChevronDownIcon className="w-6 h-6 text-white" />
          ) : (
            <ChatIcon className="w-6 h-6 text-white" />
          )}

          {/* 미확인 메시지 빨간 점 */}
          {!open && hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-gray-950" />
          )}
        </button>
      </div>
    </>
  )
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────

function SourceModal({
  documentId, onClose, onMore,
}: {
  documentId: string
  onClose: () => void
  onMore: () => void
}) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null); setDoc(null)
    getPublicDocument(documentId)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : '문서를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [documentId])

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-3 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-h-full bg-gray-900 rounded-2xl border border-gray-700/60 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'pickerPop 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {loading ? '문서 로드 중…' : doc?.title ?? '출처 문서'}
            </p>
            <p className="text-white/60 text-[10px]">참고된 가이드</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="닫기"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="space-y-2.5 animate-pulse">
              <div className="h-3.5 w-1/2 bg-gray-800 rounded" />
              <div className="h-4 w-16 bg-gray-800 rounded-full" />
              <div className="pt-3 space-y-2">
                {[95, 88, 92, 70, 80, 60, 75, 50].map((w, i) => (
                  <div key={i} className="h-3 bg-gray-800 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-lg">⚠️</div>
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          ) : doc ? (
            <div className="flex flex-col gap-3">
              <div>
                <span className={`chip ${chipClassFor(doc.docType)}`}>
                  {DOC_TYPE_LABEL[doc.docType]}
                </span>
              </div>
              <div className="guide-md text-[13px] leading-relaxed break-keep text-gray-200">
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>{doc.content}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>

        {/* 더보기 CTA */}
        <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onMore}
            disabled={loading || !!error}
            className="w-full py-2.5 rounded-2xl text-white text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' }}
          >
            가이드 상세 페이지로 더 보기
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function chipClassFor(t: DocType): string {
  switch (t) {
    case 'GUIDE':  return 'chip-indigo'
    case 'FAQ':    return 'chip-sky'
    case 'POLICY': return 'chip-emerald'
    case 'TERMS':  return 'chip-slate'
    default:       return 'chip-gray'
  }
}

function WelcomeView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 py-8">
      <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800/60 rounded-3xl flex items-center justify-center">
        <SparkleIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <p className="text-gray-300 text-sm font-semibold mb-1">AntCamp AI에 오신 걸 환영해요!</p>
        <p className="text-gray-500 text-xs leading-relaxed">
          주식 차트 보는 법, 대회 참여 방법,<br />
          투자 전략 등 무엇이든 물어보세요.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full mt-2">
        {['주식 차트 보는 법은?', '대회는 어떻게 참여하나요?', '시장가와 지정가 차이가 뭔가요?'].map((q) => (
          <div
            key={q}
            className="text-xs text-gray-500 bg-gray-800/60 border border-gray-800 rounded-xl px-3 py-2 text-left"
          >
            {q}
          </div>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  onSourceClick,
}: {
  msg: Message
  onSourceClick: (documentId: string) => void
}) {
  const isUser = msg.role === 'USER'

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* 봇 메시지: 생각 시간 표시 */}
      {!isUser && msg.thinkingSeconds != null && (
        <span className="text-[10px] text-gray-500 px-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/>
          </svg>
          {msg.thinkingSeconds}초 동안 생각함
        </span>
      )}

      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed break-words ${
          isUser
            ? 'rounded-2xl rounded-br-sm text-white whitespace-pre-wrap'
            : 'rounded-2xl rounded-bl-sm text-zinc-900 dark:text-gray-100 chat-md'
        }`}
        style={isUser
          ? { background: '#6366f1' }
          : { background: 'var(--bubble-bot, #f3f4f6)' }
        }
      >
        {isUser ? (
          msg.content
        ) : (
          // 봇 답변은 마크다운으로 렌더. 단일 개행도 줄바꿈으로 인정하기 위해 remarkBreaks 사용.
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{msg.content}</ReactMarkdown>
        )}
      </div>

      {/* 출처 */}
      {!isUser && msg.sources && msg.sources.length > 0 && (
        <div className="flex flex-col gap-1.5 px-1 max-w-[80%]">
          <span className="text-[10px] text-gray-500 font-medium">출처</span>
          {msg.sources.map((s, i) => (
            <button
              key={i}
              onClick={() => onSourceClick(s.knowledgeDocumentId)}
              className="flex items-center gap-1.5 bg-white border border-zinc-200 hover:border-indigo-300 rounded-xl px-3 py-1.5 text-left transition-colors w-full dark:bg-gray-900 dark:border-gray-800 dark:hover:border-indigo-800/60"
            >
              <svg className="w-3 h-3 text-indigo-500 flex-shrink-0 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span className="text-[11px] text-gray-700 truncate dark:text-gray-300">{s.title}</span>
              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0 dark:bg-indigo-950 dark:border-indigo-900/60 dark:text-indigo-400">
                {DOC_TYPE_LABEL[s.docType as keyof typeof DOC_TYPE_LABEL] ?? s.docType}
              </span>
            </button>
          ))}
        </div>
      )}
      <span className="text-[10px] text-gray-600 px-1">{formatTime(msg.createdAt)}</span>
    </div>
  )
}

function ThinkingIndicator() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const steps = [
    { at: 0,  label: '문서에서 답변을 찾고 있어요...' },
    { at: 3,  label: '관련 내용을 분석하고 있어요...' },
    { at: 7,  label: '답변을 생성하고 있어요...' },
    { at: 12, label: '거의 다 됐어요...' },
  ]
  const current = [...steps].reverse().find((s) => elapsed >= s.at) ?? steps[0]

  return (
    <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex flex-col gap-1.5 max-w-[80%]">
      <div className="flex items-center gap-2">
        <TypingDots />
        <span className="text-xs text-gray-400">{current.label}</span>
      </div>
      <span className="text-[10px] text-gray-500">{elapsed}초째 생각 중...</span>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-4">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

// ── 아이콘 ─────────────────────────────────────────────────────────────────

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

// ── 유틸 ───────────────────────────────────────────────────────────────────

function toMessages(msgs: ChatMessage[]): Message[] {
  return msgs.map((m) => ({
    id: m.chatMessageId,
    role: m.role,
    content: m.content,
    sources: m.sources,
    createdAt: m.createdAt,
  }))
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}