import type {
  LoginRequest, RegisterRequest, AuthResponse,
  Competition, CompetitionRanking, CompetitionParticipant, CompetitionChangeNotice,
  AccountResult, AssetResult, HoldingItem, AccountPortfolio,
} from '@/types/auth'
/** 응답에서 에러 메시지를 추출합니다. JSON·텍스트·상태코드 순으로 시도합니다. */
async function extractError(res: Response): Promise<string> {
  try {
    const json = await res.json()
    // ApiResponse 래퍼: { status, code, message, data }
    if (json?.message) return json.message
    // Spring 기본 오류: { error, message, ... }
    if (json?.error) return `${json.error}${json.message ? ': ' + json.message : ''}`
    return `서버 오류 (${res.status})`
  } catch {
    // JSON 파싱 실패 → 텍스트로 시도
    try {
      const text = await res.text()
      if (text && text.length < 200) return text
    } catch { /* ignore */ }
    return `서버 오류 (${res.status} ${res.statusText || ''})`
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await extractError(res))
  const json = await res.json()
  // ApiResponse<T> 래퍼 or 직접 T
  return ('data' in json ? json.data : json) as T
}

function authHeaders(accessToken?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

// ── 인증 (/api/auth) ───────────────────────────────────────────────────────

/** POST /api/auth/login */
export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  return unwrap<AuthResponse>(res)
}

/** POST /api/auth/login (어드민도 동일 엔드포인트, 역할은 서버가 검증) */
export async function adminLogin(req: LoginRequest): Promise<AuthResponse> {
  return login(req)
}

/** POST /api/auth/logout */
export async function logout(refreshToken: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
}

/** POST /api/auth/reissue */
export async function reissueToken(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/reissue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  return unwrap<AuthResponse>(res)
}

// ── 사용자 (/api/users) ────────────────────────────────────────────────────

/** POST /api/users/register */
export async function register(req: RegisterRequest): Promise<void> {
  const res = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(await extractError(res))
}

/** GET /api/users/me  (Header: X-User-Id) */
export async function getMyInfo(userId: string, token: string) {
  const res = await fetch('/api/users/me', {
    headers: { ...authHeaders(token), 'X-User-Id': userId },
  })
  return unwrap(res)
}

// ── 대회 (/api/competitions) ───────────────────────────────────────────────

/** GET /api/competitions?status=&page=&size= → Page<FindCompetitionResponse> */
export async function getCompetitions(params?: {
  status?: string
  page?:   number
  size?:   number
}): Promise<Competition[]> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.page   != null) q.set('page', String(params.page))
  if (params?.size   != null) q.set('size', String(params.size))
  const res = await fetch(`/api/competitions?${q}`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[getCompetitions] 오류 응답:', res.status, errText)
    throw new Error(errText || `서버 오류 (${res.status})`)
  }
  const json = await res.json()
  // 페이지 응답인 경우 .content 추출, 아니면 배열 그대로
  const raw = json?.data ?? json
  return Array.isArray(raw) ? raw : (raw?.content ?? [])
}

/** GET /api/competitions/{id} */
export async function getCompetition(id: string): Promise<Competition> {
  const res = await fetch(`/api/competitions/${id}`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<Competition>(res)
}

/** PATCH /api/competitions/{id}/publish|start|finish|cancel */
export async function patchCompetitionStatus(
  id: string,
  action: 'publications' | 'starts' | 'finishes' | 'cancellations',
  accessToken: string,
): Promise<Competition> {
  const res = await fetch(`/api/competitions/${id}/${action}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  return unwrap<Competition>(res)
}

/**
 * POST /api/competitions  (대회 생성)
 * 기존 createCompetition(req, token) 시그니처 유지
 */
export async function createCompetition(
  req: {
    name: string
    type: string
    description: string
    firstSeed: number
    registerStartAt: string
    registerEndAt: string
    competitionStartAt: string
    competitionEndAt: string
    minParticipants: number
    maxParticipants: number
  },
  accessToken: string,
): Promise<void> {
  const res = await fetch('/api/competitions', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(await extractError(res))
}

/**
 * DELETE /api/competitions/{id}?deletedBy=
 * 기존 deleteCompetition(id, token) 시그니처 유지
 */
export async function deleteCompetition(
  id: string,
  accessToken: string,
  deletedBy = 'admin',
): Promise<void> {
  const res = await fetch(
    `/api/competitions/${id}?deletedBy=${encodeURIComponent(deletedBy)}`,
    { method: 'DELETE', headers: authHeaders(accessToken) },
  )
  if (!res.ok) throw new Error(await extractError(res))
}

/** GET /api/competitions/{id}/change-notices */
export async function getChangeNotices(
  competitionId: string,
): Promise<CompetitionChangeNotice[]> {
  const res = await fetch(`/api/competitions/${competitionId}/change-notices`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<CompetitionChangeNotice[]>(res)
}

// ── 대회 참가자 ────────────────────────────────────────────────────────────

/** GET /api/competitions/{competitionId}/participants */
export async function getParticipants(
  competitionId: string,
): Promise<CompetitionParticipant[]> {
  const res = await fetch(`/api/competitions/${competitionId}/participants`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<CompetitionParticipant[]>(res)
}

/**
 * POST /api/competitions/{competitionId}/participants
 * Body: { userId, nickname }
 * 기존 joinCompetition(id, token) 에서 userId, nickname 필요하도록 변경
 */
export async function joinCompetition(
  competitionId: string,
  userId: string,
  nickname: string,
  accessToken?: string,
): Promise<CompetitionParticipant> {
  const res = await fetch(`/api/competitions/${competitionId}/participants`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ userId, nickname }),
  })
  return unwrap<CompetitionParticipant>(res)
}

/** DELETE /api/competitions/{competitionId}/participants */
export async function cancelJoinCompetition(
  competitionId: string,
  userId: string,
  nickname: string,
  accessToken?: string,
): Promise<CompetitionParticipant> {
  const res = await fetch(`/api/competitions/${competitionId}/participants`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ userId, nickname }),
  })
  return unwrap<CompetitionParticipant>(res)
}

// ── 랭킹 (/api/rankings) ──────────────────────────────────────────────────

/** GET /api/rankings/competitions/{competitionId}?page=&size= */
export async function getCompetitionRankings(
  competitionId: string,
  page = 0,
  size = 50,
): Promise<CompetitionRanking[]> {
  const res = await fetch(
    `/api/rankings/competitions/${competitionId}?page=${page}&size=${size}`,
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json?.message ?? '랭킹 조회 실패')
  // 직접 배열 or ApiResponse<배열>
  return Array.isArray(json) ? json : (json?.data ?? json?.content ?? [])
}

/** GET /api/rankings/competitions/{competitionId}/users/{userId} */
export async function getMyRanking(
  competitionId: string,
  userId: string,
): Promise<CompetitionRanking> {
  const res = await fetch(
    `/api/rankings/competitions/${competitionId}/users/${userId}`,
  )
  return unwrap<CompetitionRanking>(res)
}

// ── 계좌 / 자산 / 보유 종목 (/api/accounts, /api/assets, /api/holdings) ───

/** GET /api/accounts/{accountId}  (Header: X-User-Id) */
export async function getAccount(
  accountId: string,
  userId: string,
  accessToken?: string,
): Promise<AccountResult> {
  const res = await fetch(`/api/accounts/${accountId}`, {
    headers: { ...authHeaders(accessToken), 'X-User-Id': userId },
  })
  return unwrap<AccountResult>(res)
}

/** GET /api/assets?accountId=  (Header: X-User-Id) */
export async function getAsset(
  accountId: string,
  userId: string,
  token?: string,
): Promise<AssetResult> {
  const res = await fetch(`/api/assets?accountId=${accountId}`, {
    headers: { ...authHeaders(token), 'X-User-Id': userId },
  })
  return unwrap<AssetResult>(res)
}

/** GET /api/holdings?accountId=  (Header: X-User-Id) */
export async function getHoldings(
  accountId: string,
  userId: string,
  accessToken?: string,
): Promise<HoldingItem[]> {
  const res = await fetch(`/api/holdings?accountId=${accountId}`, {
    headers: { ...authHeaders(accessToken), 'X-User-Id': userId },
  })
  return unwrap<HoldingItem[]>(res)
}

/**
 * 계좌 + 자산 + 보유 종목을 한 번에 조회해서 AccountPortfolio 로 반환
 * (기존 getAccountDetail 대체)
 */
export async function getAccountDetail(
  accountId: string,
  userId: string,
  accessToken?: string,
): Promise<AccountPortfolio> {
  const [account, asset, holdings] = await Promise.all([
    getAccount(accountId, userId, accessToken),
    getAsset(accountId, userId, accessToken),
    getHoldings(accountId, userId, accessToken),
  ])
  return { account, asset, holdings }
}

// ── getMyAccounts: 백엔드 미지원 → 빈 배열 반환 (추후 구현 예정) ───────────
export async function getMyAccounts(_accessToken: string): Promise<AccountResult[]> {
  return []
}

// ── 매매 이력: 백엔드 미지원 → 빈 배열 반환 ──────────────────────────────
export async function getTradeHistory(
  _accountId: string,
  _accessToken: string,
): Promise<never[]> {
  return []
}

// ── 어드민 매니저: 백엔드 미지원 → stub ────────────────────────────────────
export async function getManagers(_accessToken: string) { return [] }
export async function createManager(_req: unknown, _accessToken: string) { /* stub */ }
export async function deleteManager(_userId: string, _accessToken: string) { /* stub */ }

// ── 프로필 수정: 백엔드 미지원 → stub ─────────────────────────────────────
export async function updateProfile(
  _req: { nickname: string; password?: string },
  _accessToken: string,
): Promise<void> {
  throw new Error('프로필 수정 기능은 현재 지원되지 않습니다.')
}
