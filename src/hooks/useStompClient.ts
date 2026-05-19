/**
 * STOMP WebSocket 클라이언트 훅
 *
 * - SockJS 없이 브라우저 네이티브 WebSocket 사용 (/ws-stomp 엔드포인트)
 * - 앱 마운트 시 연결, 구독 종목 변경 시 STOMP 구독/해제 자동 동기화
 * - 재연결(reconnectDelay) 시 기존 종목 재구독
 */
import { useEffect, useRef } from 'react'
import { Client, type StompSubscription } from '@stomp/stompjs'
import { useStockStore } from '@/store/stockStore'
import type { StockPriceData, OrderBookData } from '@/types/stock'

type SubPair = { price: StompSubscription; orderBook: StompSubscription }

export function useStompClient() {
  const clientRef = useRef<Client | null>(null)
  const subsRef = useRef<Record<string, SubPair>>({})

  const { stocks, updatePrice, updateOrderBook, setStompConnected } = useStockStore()

  // ── 초기 연결 (마운트 1회) ─────────────────────────────────────────────
  useEffect(() => {
    const wsUrl =
      window.location.protocol === 'https:'
        ? 'wss://api.antcamp.site/ws-stomp'
        : 'ws://api.antcamp.site/ws-stomp'

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      onConnect: () => {
        console.log('[STOMP] 연결 성공')
        setStompConnected(true)
        // 재연결 시 현재 구독 종목 복구
        const currentStocks = useStockStore.getState().stocks
        Object.keys(currentStocks).forEach((code) => {
          subscribeCode(client, code)
        })
      },
      onDisconnect: () => {
        console.log('[STOMP] 연결 끊김')
        setStompConnected(false)
        subsRef.current = {}
      },
      onStompError: (frame) => {
        console.error('[STOMP] 오류:', frame.headers['message'])
      },
      onWebSocketError: (evt) => {
        console.warn('[STOMP] WebSocket 오류 (백엔드 미실행 시 정상):', evt)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      clientRef.current = null
      subsRef.current = {}
      setStompConnected(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 구독 종목 변경 감지 ────────────────────────────────────────────────
  useEffect(() => {
    const client = clientRef.current
    if (!client?.connected) return

    const live = Object.keys(stocks)
    const subbed = Object.keys(subsRef.current)

    // 새 종목 구독
    live.forEach((code) => {
      if (!subsRef.current[code]) subscribeCode(client, code)
    })

    // 제거된 종목 해제
    subbed.forEach((code) => {
      if (!stocks[code]) {
        subsRef.current[code]?.price.unsubscribe()
        subsRef.current[code]?.orderBook.unsubscribe()
        delete subsRef.current[code]
        console.log(`[STOMP] 구독 해제: ${code}`)
      }
    })
  }, [stocks]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 헬퍼 ──────────────────────────────────────────────────────────────
  function subscribeCode(client: Client, code: string) {
    if (subsRef.current[code]) return

    const price = client.subscribe(`/topic/price/${code}`, (msg) => {
      try {
        updatePrice(JSON.parse(msg.body) as StockPriceData)
      } catch (e) {
        console.error('[STOMP] price 파싱 오류', e)
      }
    })

    const orderBook = client.subscribe(`/topic/orderbook/${code}`, (msg) => {
      try {
        updateOrderBook(JSON.parse(msg.body) as OrderBookData)
      } catch (e) {
        console.error('[STOMP] orderbook 파싱 오류', e)
      }
    })

    subsRef.current[code] = { price, orderBook }
    console.log(`[STOMP] 구독 시작: ${code}`)
  }

  return clientRef
}
