// KRX 휴장일 목록
// 토/일 외 추가 휴장일만 등록. KRX 공시 (https://open.krx.co.kr) 기준으로 매년 1월에 수동 갱신 필요.
// 음력 휴일(설/추석/석탄일) 및 대체공휴일은 누락 위험이 있어 배포 전 반드시 검증.
const KRX_HOLIDAYS = new Set<string>([
  // ── 2026 ────────────────────────────────────────────────────────────────
  '2026-01-01', // 신정
  '2026-02-16', // 설날 전일
  '2026-02-17', // 설날 (음력 1/1)
  '2026-02-18', // 설날 익일
  '2026-03-02', // 삼일절 대체공휴일 (3/1 일)
  '2026-05-01', // 근로자의 날
  '2026-05-05', // 어린이날
  '2026-05-25', // 부처님오신날 대체공휴일 (5/24 일)
  '2026-08-17', // 광복절 대체공휴일 (8/15 토)
  '2026-09-24', // 추석 전일
  '2026-09-25', // 추석 (음력 8/15)
  '2026-09-28', // 추석 익일 대체공휴일 (9/26 토)
  '2026-10-05', // 개천절 대체공휴일 (10/3 토)
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절
  '2026-12-31', // 연말 휴장

  // ── 2027 (부분 — 연초 KRX 공시 확정 후 채워넣을 것) ──────────────────────
  '2027-01-01', // 신정
])

// now → KST wall-clock 으로 환산한 Date.
// 반환 객체의 getFullYear/getMonth/getDate/getHours 등이 KST 기준값을 돌려준다.
// (Date 자체 UTC 타임스탬프는 KST 가 아니므로, 두 KST-shifted Date 끼리 빼야만 실제 경과시간이 된다.)
export function toKstDate(now: Date): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
}

export function isKrxHoliday(kst: Date): boolean {
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  return KRX_HOLIDAYS.has(`${y}-${m}-${d}`)
}

export function isTradingDay(kst: Date): boolean {
  const day = kst.getDay()
  if (day === 0 || day === 6) return false
  return !isKrxHoliday(kst)
}

// kst 시점 기준 다음 영업일 09:00 (KST wall-clock Date).
// kst 와 동일한 방식으로 구성된 Date 이므로 `.getTime()` 차이가 실제 경과 ms.
export function nextKrxOpenAt(kst: Date): Date {
  const sec = kst.getHours() * 3600 + kst.getMinutes() * 60 + kst.getSeconds()
  const next = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate(), 9, 0, 0, 0)
  if (isTradingDay(kst) && sec < 9 * 3600) return next
  do {
    next.setDate(next.getDate() + 1)
  } while (!isTradingDay(next))
  return next
}
