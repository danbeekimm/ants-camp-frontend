# ants-camp-frontend

개미배움캠프 — 가상 주식 투자 대회 플랫폼의 프론트엔드입니다.
실시간 시세를 보며 모의 매매하고 대회 수익률로 순위를 겨루는 사용자 화면과, RAG 챗봇 품질을 평가·운영하는 관리자 콘솔을 담고 있습니다.

| | |
|---|---|
| **배포** | https://app.antscamp.site |
| **체험** | 게스트 로그인 — https://app.antscamp.site/guest/login (가입 없이 둘러보기) |
| **백엔드** | [danbeekimm/ants-camp](https://github.com/danbeekimm/ants-camp) |

> 5인 부트캠프 팀 프로젝트 (2026) · 부트캠프 대상 수상
> 프론트엔드 전체(사용자 + 관리자)를 김단비가 구축 주도했고, 백엔드는 assistant(RAG·평가) · notification(AIOps) · 모니터링 스택을 담당했습니다.

## 주요 화면

### 사용자

- **메인 / 종목 차트** — 실시간 시세 티커, 캔들·라인 차트(Recharts), 종목 검색·상세, 뉴스 피드
- **매매** — 호가창(OrderBook)과 주문 패널(TradePanel). WebSocket으로 수신한 시세 기준으로 주문
- **투자 대회** — 대회 목록·상세·실시간 대시보드. 수익률 순위와 티어 표시
- **포트폴리오 / 마이페이지** — 보유 종목, 평가 손익, 프로필 관리
- **AI 챗봇** — FAQ·약관·매매규칙 기반 RAG 챗봇. 답변은 마크다운으로 렌더링

### 관리자

- **회원 / 대회 관리** — 검색·필터, 대회 규칙(거래 시간·종목 제한·시드머니) 설정
- **RAG 운영 콘솔** — 문서 등록·관리, 평가 실행(Eval Run), Pairwise A/B 비교 결과 시각화, 프롬프트 버전 관리.
  백엔드의 LLM-as-a-Judge 평가 파이프라인 결과를 운영자가 화면에서 확인하고 모델 교체를 결정하도록 한 화면입니다. 평가 파이프라인(백엔드)과 이 콘솔(프론트)을 같은 사람이 설계해, 화면이 필요로 하는 형태로 API를 맞췄습니다.
- **알림 관리** — AIOps 알림 목록·상세 조회

## 기술 스택

| 분류 | 선택 | 비고 |
|---|---|---|
| 코어 | React 18 · TypeScript 5 · Vite 5 | |
| 스타일 | Tailwind CSS 3 | 관리자 화면은 `components/admin` 공통 컴포넌트로 통일 |
| 라우팅 | React Router 7 | 사용자 / 관리자 레이아웃 분리 |
| 상태 관리 | Zustand | 전역 상태가 인증·시세·티커·테마 4개 스토어로 한정적이어서, 보일러플레이트가 적은 경량 스토어로 충분하다고 판단해 Redux 대신 선택 |
| 실시간 | @stomp/stompjs | 네이티브 WebSocket으로 게이트웨이 STOMP 스트림 구독 (`useStompClient`) |
| 차트 | Recharts | 캔들·라인 차트, Sparkline |
| 기타 | react-markdown · framer-motion · date-fns | 챗봇 답변 렌더링, 전환 애니메이션 |
| 품질 | ESLint · tsc (`--max-warnings 0`) | CI에서 lint·타입 검사·빌드 강제 |

## 실시간 시세 처리

한국투자증권 WebSocket → 백엔드(trade-service) → STOMP 브로커 → 프론트 구독 구조입니다.

- `useStompClient` 훅이 연결 수립·재연결·구독 해제를 담당. SockJS 없이 네이티브 WebSocket으로 `/ws-stomp`에 붙고, 페이지 프로토콜에 맞춰 `wss`/`ws`를 자동 선택
- 구독은 `stockStore.stocks` 맵을 단일 소스로 삼아 선언적으로 동기화 — 맵에 종목이 추가/제거되면 `/topic/price/{code}`·`/topic/orderbook/{code}` 구독이 자동으로 맺히고 끊어지며, 재연결 시 현재 종목을 복구
- 수신 시세는 `stockStore`(Zustand)에 반영되어 티커·차트·주문 패널이 같은 소스를 구독
- 연결 상태는 `ConnectionBadge`가 `stockStore.kisConnected`로 표시하고, `useKisStatus`가 5초 간격으로 KIS 연결 상태를 폴링해 갱신

## 배포 / 운영

Vercel을 쓰지 않고 OCI 인스턴스에 직접 배포하는 구조로, 프론트 빌드부터 서빙·TLS까지 직접 구성했습니다.

- **CI** (`.github/workflows/ci.yml`) — PR마다 ESLint · `tsc` 타입 검사 · Vite 빌드 검증
- **CD** (`.github/workflows/deploy.yml`) — main push → 빌드 → `dist`를 OCI로 전송 → **원자적 교체**(임시 디렉터리에 올린 뒤 `mv`로 스왑). 정적 파일만 교체하므로 무중단
- **서빙** (`deploy/nginx-frontend.conf`) — Nginx가 SPA 서빙(`try_files $uri /index.html`), 정적 `dist`를 서빙하고 `/api`·`/ws-stomp`·`/yahoo`를 게이트웨이(`127.0.0.1:8080`)로 프록시
- **외부 API 키 보호** — Yahoo Finance(`/yahoo`)·네이버 뉴스(`/api/naver/news`)는 프록시를 경유해, 클라이언트 번들에 키가 들어가지 않도록 함. 네이버 키는 운영에서 Nginx snippet, 개발에서 vite 프록시가 주입

## 프로젝트 구조

```
src/
├── pages/            # 라우트 단위 화면
│   ├── admin/        # 관리자 — 회원·대회·알림
│   │   └── assistant/  # RAG 운영 콘솔 (문서·평가·Pairwise·프롬프트 버전)
│   └── ...           # 메인·매매·대회·포트폴리오·가이드
├── components/
│   ├── admin/        # 관리자 공통 컴포넌트 (Button·Card·StatCard·FilterPills 등)
│   ├── ui/           # 범용 컴포넌트 (Alert·DatePicker·Spinner·WinBar 등)
│   └── ...           # 도메인 컴포넌트 (CandleChart·OrderBook·TradePanel·ChatBot 등)
├── hooks/            # useStompClient · useKisStatus · usePollingStatus · useCursorList(커서 페이지네이션)
├── services/         # 도메인별 API 모듈 (auth·stock·market·assistant·notification·news)
├── store/            # Zustand 스토어 (auth·stock·ticker·theme)
└── config/
```

## 실행 방법

```bash
npm install
npm run dev      # http://localhost:3001 (api.antscamp.site로 프록시)
npm run build    # tsc 타입 검사 + 프로덕션 빌드
npm run lint     # ESLint (--max-warnings 0)
```

### 환경 변수

클라이언트 번들에 들어가는 `VITE_` 환경 변수는 없습니다. API는 모두 same-origin 상대경로(`/api/...`)로 호출하고, 개발에서는 `vite.config.ts`의 프록시가, 운영에서는 Nginx가 게이트웨이로 전달합니다.

개발 중 네이버 뉴스 프록시를 쓰려면 키가 필요합니다. 키는 서버 측 프록시만 읽으며 **`VITE_` 접두사를 붙이지 않아** 클라이언트 번들에 노출되지 않습니다.

```bash
# .env (개발용 — 네이버 뉴스 프록시에서만 사용)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

## 팀 / 역할

| 영역 | 담당 |
|---|---|
| 프론트엔드 전체 (사용자 + 관리자) | 김단비 — 구축 주도 |
| 백엔드 — assistant · notification · monitoring | 김단비 |

백엔드 아키텍처(MSA · RAG · LLM-as-a-Judge · AIOps)는 [백엔드 레포지토리](https://github.com/danbeekimm/ants-camp)를 참고해 주세요.
