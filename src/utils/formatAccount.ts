// UUID v4 패턴 (8-4-4-4-12 hex). 백엔드 일부 계좌가 accountNumber 필드에
// UUID 를 그대로 저장하는 경우가 있어 화면에 그대로 노출되면 가독성이 떨어진다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 계좌 번호 표시용 포맷터.
 * - 정상 계좌번호: 그대로 반환
 * - UUID 형태: 앞 8자만 추출해 "계좌 9f8d8aa3" 형식으로 단축
 * - 빈 값: '계좌'
 */
export function formatAccountLabel(accountNumber?: string | null): string {
  if (!accountNumber) return '계좌'
  if (UUID_RE.test(accountNumber)) return `계좌 ${accountNumber.slice(0, 8)}`
  return accountNumber
}
