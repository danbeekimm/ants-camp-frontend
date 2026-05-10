import { useStockStore } from '@/store/stockStore'

export function ConnectionBadge() {
  const kisConnected = useStockStore((s) => s.kisConnected)
  const stompConnected = useStockStore((s) => s.stompConnected)

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            stompConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
          }`}
        />
        <span className={stompConnected ? 'text-green-400' : 'text-gray-500'}>
          STOMP {stompConnected ? '연결됨' : '연결 중...'}
        </span>
      </span>
      <span className="text-gray-600">|</span>
      <span className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            kisConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'
          }`}
        />
        <span className={kisConnected ? 'text-green-400' : 'text-yellow-500'}>
          KIS {kisConnected ? '연결됨' : '미연결'}
        </span>
      </span>
    </div>
  )
}
