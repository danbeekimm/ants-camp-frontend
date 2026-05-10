import { useEffect } from 'react'
import { getKisStatus } from '@/services/stockApi'
import { useStockStore } from '@/store/stockStore'

/**
 * 5초마다 KIS WebSocket 연결 상태를 폴링
 */
export function useKisStatus() {
  const setKisConnected = useStockStore((s) => s.setKisConnected)

  useEffect(() => {
    const check = async () => {
      try {
        const status = await getKisStatus()
        setKisConnected(status.includes('연결 중'))
      } catch {
        setKisConnected(false)
      }
    }

    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [setKisConnected])
}
