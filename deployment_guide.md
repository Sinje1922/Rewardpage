# 🚀 pickku 배포 가이드

## 전체 구조

```
[사용자 브라우저]
       │
       ▼
[Vercel] app.pickku.com        ← 프론트엔드 (Vue 3 빌드 결과물)
       │  /api/* → 서버 PC로 프록시
       ▼
[서버 PC] api.pickku.com       ← Node.js 백엔드 (포트 4000)
       │
       ▼
[MySQL] localhost:3306          ← 데이터베이스 (서버 PC 내부)
```

---

## 1. 서버 PC 설정

### 1-1. 필수 소프트웨어 설치

- **Node.js** v18 이상
- **MySQL** 8.0 이상
- **PM2** (프로세스 관리): `npm install -g pm2`
- **Nginx** (리버스 프록시, 도메인 연결용)

### 1-2. 코드 배포

```bash
# 서버 PC에서 실행
git clone https://github.com/사용자명/pickku.git /home/pickku
cd /home/pickku/server

# 의존성 설치 및 빌드
npm install
npm run build
```

### 1-3. 환경 변수 설정 (`server/.env`)

> ⚠️ **중요**: 서버를 반드시 `server/` 디렉토리에서 실행해야 `.env`가 로드됩니다.

```env
# ── 데이터베이스 ───────────────────────────────────────────
DATABASE_URL="mysql://root:비밀번호@localhost:3306/reward_db"

# ── 보안 ──────────────────────────────────────────────────
JWT_SECRET="최소 32자 이상의 랜덤 문자열"

# ── 도메인 ────────────────────────────────────────────────
FRONTEND_URL="https://app.pickku.com"

# ── Google OAuth (회원가입 / YouTube 연동) ─────────────────
GOOGLE_CLIENT_ID="Google Cloud Console에서 발급"
GOOGLE_CLIENT_SECRET="Google Cloud Console에서 발급"
YOUTUBE_REDIRECT_URI="https://api.pickku.com/api/oauth/youtube/callback"

# ── Telegram 봇 (텔레그램 미션 검증 필수) ─────────────────
# 없으면: "서버에 텔레그램 봇 토큰이 설정되지 않았습니다" 오류 발생
TELEGRAM_BOT_TOKEN="BotFather에서 발급한 토큰 (예: 1234567890:AAF...)"
TELEGRAM_BOT_NAME="봇 사용자명 (예: Pickku_Official_bot)"

# ── Discord (디스코드 미션 검증 필수) ──────────────────────
# 없으면: Discord 서버 참여 검증 실패
DISCORD_BOT_TOKEN="Discord Developer Portal에서 발급"
DISCORD_CLIENT_ID="Discord 앱 Client ID"
DISCORD_CLIENT_SECRET="Discord 앱 Client Secret"
DISCORD_REDIRECT_URI="https://api.pickku.com/api/oauth/discord/callback"
```

> **각 항목이 없을 때 발생하는 오류:**
> | 누락된 항목 | 발생 오류 |
> |------------|----------|
> | `TELEGRAM_BOT_TOKEN` | Telegram 채널/그룹 미션 → "서버에 텔레그램 봇 토큰이 설정되지 않았습니다" |
> | `DISCORD_BOT_TOKEN` | Discord 미션 → "서버의 디스코드 봇 설정이 누락되었습니다" |
> | `GOOGLE_CLIENT_ID/SECRET` | Google 로그인, YouTube 계정 연동 불가 |

### 1-4. 데이터베이스 초기화

```bash
cd /home/pickku/server

# 테이블 생성
npx prisma db push

# (선택) 초기 테스트 데이터 삽입
npx tsx prisma/seed.ts
```

### 1-5. PM2로 서버 실행

> ⚠️ **반드시 `server/` 디렉토리에서 실행**해야 `.env` 파일이 정상 로드됩니다.

```bash
cd /home/pickku/server

# 서버 시작
pm2 start dist/index.js --name pickku-api

# 서버 PC 재시작 시 자동 실행 등록
pm2 save
pm2 startup
```

PM2 주요 명령어:
```bash
pm2 list              # 실행 중인 프로세스 목록
pm2 logs pickku-api   # 실시간 로그 확인
pm2 restart pickku-api  # 서버 재시작
pm2 stop pickku-api   # 서버 중지
```

> **Telegram 봇 토큰 로드 확인**: 서버 시작 시 로그에  
> `Starting Telegram Bot Polling Service...` 가 보이면 정상  
> `TELEGRAM_BOT_TOKEN is not set` 이 보이면 `.env` 경로 또는 값을 확인하세요.

### 1-6. Nginx 리버스 프록시 설정

```nginx
# /etc/nginx/sites-available/pickku-api
server {
    listen 80;
    server_name api.pickku.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 파일 업로드 용량 제한 (기본 1MB → 20MB로 확대)
    client_max_body_size 20M;
}
```

```bash
# 설정 적용
sudo ln -s /etc/nginx/sites-available/pickku-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# HTTPS 인증서 발급 (Let's Encrypt)
sudo certbot --nginx -d api.pickku.com
```

---

## 2. 프론트엔드 배포 (Vercel)

### 2-1. Vercel 프로젝트 설정

1. [vercel.com](https://vercel.com) 접속 → GitHub 레포지토리 연결
2. **설정**:
   - `Framework Preset`: `Vite`
   - `Root Directory`: `web`
   - `Build Command`: `npm run build`
   - `Output Directory`: `dist`

### 2-2. Vercel 환경 변수

| 키 | 값 |
|----|-----|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_TELEGRAM_BOT_NAME` | Telegram 봇 이름 (예: `Pickku_Official_bot`) |

> `VITE_API_URL`은 설정하지 않아도 됩니다.  
> `vercel.json`의 rewrites 규칙이 `/api/*` 요청을 `https://api.pickku.com`으로 자동 전달합니다.

### 2-3. vercel.json 구조 (참고)

```json
{
  "rewrites": [
    { "source": "/api/:path*",     "destination": "https://api.pickku.com/api/:path*" },
    { "source": "/uploads/:path*", "destination": "https://api.pickku.com/uploads/:path*" },
    { "source": "/(.*)",           "destination": "/index.html" }
  ]
}
```

---

## 3. 코드 업데이트 배포 절차

### 백엔드 업데이트

```bash
cd /home/pickku

# 최신 코드 받기
git pull origin main

# 빌드
cd server
npm install
npm run build

# 서버 재시작
pm2 restart pickku-api
```

### 프론트엔드 업데이트

GitHub에 푸시하면 Vercel이 자동으로 재배포합니다.

---

## 4. 트러블슈팅

### Telegram 미션 검증 실패 — "서버에 텔레그램 봇 토큰이 설정되지 않았습니다"

```bash
# 1. .env 파일에 토큰이 있는지 확인
cat /home/pickku/server/.env | grep TELEGRAM_BOT_TOKEN

# 2. 서버 시작 로그 확인
pm2 logs pickku-api --lines 50 | grep -i telegram

# 3. 환경변수가 로드되는지 직접 확인
cd /home/pickku/server && node -e "require('dotenv').config(); console.log('TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '설정됨' : '없음')"
```

> ⚠️ 반드시 `server/` 디렉토리에서 pm2를 실행해야 합니다.  
> 프로젝트 루트에서 실행하면 `.env`를 찾지 못합니다.

### Discord 미션 검증 실패 — "서버의 디스코드 봇 설정이 누락"

```bash
# .env 확인
cat /home/pickku/server/.env | grep DISCORD_BOT_TOKEN

# Discord 봇이 해당 서버에 초대되어 있는지 확인
# Developer Portal → OAuth2 → Server Members Intent 활성화 필수
```

### YouTube 구독/좋아요 — "채널 ID / 비디오 ID 필요"

캠페인 생성 시 해당 미션의 필수 설정값이 비어있는 경우입니다.  
Ops 콘솔에서 캠페인을 편집하여 누락된 값을 입력하세요.

| 미션 | 필수 입력 항목 |
|------|-------------|
| YouTube 구독 | 채널 ID (UC로 시작하는 문자열) |
| YouTube 좋아요 | 비디오 ID (11자리) |
| Discord 참여 | 서버 ID (숫자, 18자리) — 초대 URL 아님 |
| Telegram 채널/그룹 | 채널/그룹 사용자명 또는 URL |

---

## 5. 최종 체크리스트

- [ ] `server/.env` 모든 항목 입력 완료
- [ ] `pm2 logs pickku-api`에 `Starting Telegram Bot Polling Service...` 출력 확인
- [ ] `app.pickku.com` 접속 및 로그인 정상 작동
- [ ] `api.pickku.com/api/health` 또는 임의 API 호출 응답 확인
- [ ] Telegram 계정 연동 → Telegram 미션 검증 테스트
- [ ] Discord 계정 연동 → Discord 미션 검증 테스트
- [ ] YouTube 계정 연동 → YouTube 미션 검증 테스트
