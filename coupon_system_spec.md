# 🎟️ pickku 쿠폰 시스템 기획서

## 1. 개요

### 목적
- 유저의 플랫폼 재방문율 및 체류 시간 증가
- 캠페인 운영자(B2B)에게 새로운 보상 수단 제공
- 추첨 기반 게임 요소로 플랫폼 재미 요소 강화

### 쿠폰 생태계 구조
```
┌─────────────────────────────────────────────────┐
│               pickku 쿠폰 생태계                  │
│                                                  │
│  [이벤트 쿠폰]         [캠페인 보상 쿠폰]          │
│  출석체크 / 친구초대     운영자 구매 후 캠페인 설정  │
│         │                        │               │
│         └──────── 유저 쿠폰 지갑 ──┘               │
│                        │                         │
│                   🎰 추첨기 사용                   │
│                        │                         │
│                   랜덤 보상 지급                   │
└─────────────────────────────────────────────────┘
```

---

## 2. 방식 1 — 이벤트 쿠폰

### 2-1. 쿠폰 지급 트리거

| 이벤트 | 지급 수 | 조건 | 제한 |
|--------|--------|------|------|
| 출석체크 | 1장 | 하루 1회 | 당일 1회 |
| 연속 출석 7일 | +5장 보너스 | 7일 연속 | 주 1회 |
| 친구 초대 | 3장 | 피초대자 가입 완료 시 | 무제한 |
| 피초대자 보상 | 2장 | 초대 링크로 가입 시 | 최초 1회 |

---

### 2-2. 출석체크 플로우

```
유저 앱 접속
    │
    ▼
출석체크 버튼 클릭
    │
    ├─ 오늘 이미 체크 → "오늘 출석 완료" 표시 (종료)
    │
    └─ 미체크
            │
            ▼
        DB 기록 저장 (attendances 테이블)
            │
            ▼
        연속 출석 일수 계산
            │
            ├─ 7일 연속 → 보너스 쿠폰 +5장 추가
            │
            └─ 일반 → 쿠폰 1장 지급
                    │
                    ▼
                CouponTransaction 기록 (type: ATTENDANCE)
                    │
                    ▼
                "🎟️ 쿠폰 1장 획득!" 팝업
```

---

### 2-3. 친구 초대 플로우

```
[초대자] 마이페이지 → 친구 초대
    │
    ▼
고유 초대 링크 생성
app.pickku.com/join?ref={userId}
    │
    ▼
링크 공유 (카카오톡 / URL 복사)

    ── 피초대자 ──▶ 링크 클릭 → 회원가입 페이지
                        │
                        ▼
                    회원가입 완료
                        │
                        ▼
                    유효성 검사
                    (자기 초대 방지 / 중복 방지)
                        │
                        ▼
                    ┌───────────────────┐
                    │ 초대자: 쿠폰 +3장  │
                    │ 피초대자: 쿠폰 +2장│
                    └───────────────────┘
                        │
                        ▼
                    양쪽 모두 "🎟️ 쿠폰 획득!" 알림
```

---

## 3. 방식 2 — 캠페인 보상 쿠폰

### 3-1. 전체 흐름

```
캠페인 운영자
    │
    ▼
[쿠폰 상점] 패키지 선택 → 결제
    │  (100장 / 500장 / 1000장 / 5000장)
    ▼
운영자 쿠폰 잔고 충전
    │
    ▼
[캠페인 생성] 보상 타입 → "쿠폰" 선택
    │  완료 시 지급 수량 설정 (예: 3장)
    │  최대 참여 인원 기반 필요 쿠폰 자동 계산
    ▼
캠페인 게시 (필요 수량 escrow 예약)
    │
    ▼  (유저)
미션 완료 및 제출
    │
    ▼
운영자 잔고 차감 + 유저에게 쿠폰 지급
    │
    ▼
유저 쿠폰 지갑 → 추첨기 사용 가능
```

---

### 3-2. 쿠폰 상점 패키지

| 패키지 | 수량 | 가격 | 단가 |
|--------|------|------|------|
| 스타터 | 100장 | 10,000원 | 100원/장 |
| 스탠다드 | 500장 | 45,000원 | 90원/장 |
| 프리미엄 | 1,000장 | 80,000원 | 80원/장 |
| 엔터프라이즈 | 5,000장 | 350,000원 | 70원/장 |

---

### 3-3. 캠페인 생성 시 쿠폰 보상 설정 플로우

```
보상 타입 선택 화면
[포인트] [쿠폰] [외부 상품]
    │
    └─ "쿠폰" 선택
            │
            ▼
        현재 잔고 표시: "보유 쿠폰: 500장"
            │
            ▼
        지급 수량 입력: 완료 시 쿠폰 [ 3 ] 장
            │
            ▼
        예상 소요 자동 계산:
        "최대 100명 × 3장 = 최대 300장"
            │
            ├─ 잔고 부족 → "쿠폰 상점에서 구매하세요" 버튼
            │
            └─ 잔고 충분 → 캠페인 생성 완료
                            300장 escrow 예약
                            (캠페인 종료 시 미사용 수량 반환)
```

---

## 4. 추첨기 (잭팟) 시스템

### 4-1. 추첨기 등급

| 등급 | 필요 쿠폰 | 특징 |
|------|----------|------|
| 일반 추첨기 | 1장 | 소액 보상 위주 |
| 고급 추첨기 | 5장 | 고가 보상 포함 |
| 잭팟 추첨기 | 20장 | 대형 상품, 낮은 확률 |

### 4-2. 보상 확률 예시 (일반 추첨기)

| 보상 | 확률 |
|------|------|
| 꽝 (위로 쿠폰 0.5장 반환) | 40% |
| 포인트 100P | 30% |
| 포인트 500P | 15% |
| 포인트 1,000P | 8% |
| 쿠폰 3장 | 5% |
| 특별 경품 | 2% |

### 4-3. 추첨 플로우

```
유저 → 추첨기 페이지 접속
    │
    ▼
추첨기 등급 선택
    │
    ▼
"쿠폰 N장으로 추첨하시겠습니까?" 확인
    │
    ├─ 쿠폰 부족 → "쿠폰이 부족합니다" + 이벤트 참여 안내
    │
    └─ 쿠폰 충분
            │
            ▼
        DB 트랜잭션: 쿠폰 차감
            │
            ▼
        서버에서 확률 계산 (클라이언트 불가)
            │
            ▼
        lottery_results 기록
            │
            ▼
        클라이언트에 결과 반환 → 애니메이션 재생
            │
            ▼
        보상 지급 + 결과 팝업
        (포인트 → user.point 증가 / 쿠폰 → 재지급)
```

---

## 5. 데이터베이스 설계 (Prisma)

```prisma
// 유저 쿠폰 잔고
model UserCouponBalance {
  id        String   @id @default(cuid())
  userId    String   @unique
  amount    Int      @default(0)
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}

// 쿠폰 거래 이력 (획득/사용 통합 관리)
model CouponTransaction {
  id        String          @id @default(cuid())
  userId    String
  amount    Int             // 양수: 획득 / 음수: 사용
  type      CouponTxType
  refId     String?         // 관련 ID (캠페인ID, 추첨ID 등)
  note      String?
  createdAt DateTime        @default(now())
  user      User            @relation(fields: [userId], references: [id])
}

enum CouponTxType {
  ATTENDANCE          // 출석체크
  ATTENDANCE_BONUS    // 연속 출석 보너스
  REFERRAL_SENT       // 친구 초대 (초대자 보상)
  REFERRAL_RECEIVED   // 친구 초대 (피초대자 보상)
  CAMPAIGN_REWARD     // 캠페인 완료 보상
  LOTTERY_USE         // 추첨기 사용 (차감)
  LOTTERY_WIN_COUPON  // 추첨 당첨 쿠폰 보상
  ADMIN_GRANT         // 관리자 수동 지급
}

// 출석 기록
model Attendance {
  id        String   @id @default(cuid())
  userId    String
  date      String   // "2025-06-10" 형식
  streak    Int      @default(1)  // 연속 출석 일수
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  @@unique([userId, date])
}

// 친구 초대 기록
model ReferralLog {
  id         String   @id @default(cuid())
  referrerId String
  refereeId  String   @unique  // 피초대자 중복 초대 방지
  rewarded   Boolean  @default(false)
  createdAt  DateTime @default(now())
}

// 운영자 쿠폰 잔고
model OperatorCouponBalance {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Int      @default(0)
  escrow    Int      @default(0)  // 캠페인 예약분
  updatedAt DateTime @updatedAt
}

// 운영자 쿠폰 구매 이력
model CouponPurchase {
  id         String   @id @default(cuid())
  operatorId String
  quantity   Int
  priceKrw   Int      // 결제 금액 (원)
  paymentId  String?  // PG사 결제 ID
  createdAt  DateTime @default(now())
}

// 추첨 결과
model LotteryResult {
  id          String      @id @default(cuid())
  userId      String
  tier        LotteryTier
  couponUsed  Int
  rewardType  String      // "POINT" | "COUPON" | "ITEM" | "NONE"
  rewardAmt   Int         @default(0)
  rewardNote  String?
  createdAt   DateTime    @default(now())
}

enum LotteryTier {
  BASIC     // 1장
  ADVANCED  // 5장
  JACKPOT   // 20장
}
```

---

## 6. API 엔드포인트

### 유저용

| Method | 경로 | 설명 |
|--------|------|------|
| POST | `/api/attendance/checkin` | 출석체크 |
| GET | `/api/attendance/status` | 오늘 체크 여부 + 연속 일수 |
| GET | `/api/referral/link` | 내 초대 링크 |
| GET | `/api/referral/stats` | 초대 현황 |
| GET | `/api/coupons/balance` | 내 쿠폰 잔고 |
| GET | `/api/coupons/history` | 쿠폰 거래 이력 |
| POST | `/api/lottery/spin` | 추첨 실행 |
| GET | `/api/lottery/history` | 추첨 이력 |

### 운영자용

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/ops/coupon-store/packages` | 구매 패키지 목록 |
| POST | `/api/ops/coupon-store/purchase` | 쿠폰 구매 |
| GET | `/api/ops/coupon-store/balance` | 잔고 조회 |
| GET | `/api/ops/coupon-store/history` | 구매 이력 |

---

## 7. 화면 목록

### 유저 화면

| 화면 | 위치 | 주요 요소 |
|------|------|----------|
| 출석체크 | 홈 or 마이페이지 | 달력, 연속 스트릭(🔥), 오늘 체크 버튼 |
| 친구 초대 | 마이페이지 > 친구 초대 | 링크 복사, 카카오 공유, 초대 현황 |
| 쿠폰 지갑 | 마이페이지 > 내 쿠폰 | 보유 수, 거래 이력 |
| 추첨기 | 메인 메뉴 탭 | 등급 선택, 추첨 애니메이션, 결과 팝업 |

### 운영자 화면

| 화면 | 위치 | 주요 요소 |
|------|------|----------|
| 쿠폰 상점 | Ops 대시보드 | 패키지 카드, 결제, 현재 잔고 |
| 캠페인 보상 설정 | 캠페인 생성 (기존 수정) | 보상 타입에 "쿠폰" 추가, 잔고 표시 |

---

## 8. 개발 우선순위

### Phase 1 — 핵심 기능 (1~2주)
- [ ] Prisma 스키마 추가 및 마이그레이션
- [ ] 출석체크 API + 화면
- [ ] 쿠폰 지갑 API + 마이페이지 UI
- [ ] 캠페인 완료 시 쿠폰 지급 로직 (기존 보상 시스템 연동)

### Phase 2 — 수익화 기능 (2~3주)
- [ ] 친구 초대 시스템 (링크 생성, 추적)
- [ ] 운영자 쿠폰 상점 + PG 결제 연동
- [ ] 캠페인 생성 화면에 쿠폰 보상 옵션 추가
- [ ] Escrow 예약 로직

### Phase 3 — 게임 요소 (3~4주)
- [ ] 추첨기 페이지 + 슬롯/룰렛 애니메이션
- [ ] 추첨 확률 어드민 관리 화면
- [ ] 추첨 결과 통계 대시보드

---

## 9. 보안 / 어뷰징 방지

| 위험 | 방지 방법 |
|------|----------|
| 출석 중복 클릭 | DB unique(userId, date) + idempotency |
| 자기 자신 초대 | referrerId !== refereeId 서버 검증 |
| 계정 다중 생성 | 이메일/전화번호 인증 필수 |
| 추첨 결과 조작 | 확률 계산 서버 전용, 클라이언트는 결과만 수신 |
| 쿠폰 잔고 음수 | DB 트랜잭션 + 차감 전 잔고 검증 |
| 운영자 초과 사용 | 캠페인 생성 시 escrow 예약으로 실잔고 보호 |
