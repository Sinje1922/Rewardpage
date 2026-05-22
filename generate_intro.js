const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "pickku 프로젝트 소개";

// ── 팔레트 ─────────────────────────────────────────────────────
const NAVY   = "1A2F4B";
const BLUE   = "2563EB";
const SKY    = "E0F2FE";
const MINT   = "059669";
const AMBER  = "D97706";
const WHITE  = "FFFFFF";
const G1     = "1E293B";
const G2     = "475569";
const G3     = "94A3B8";
const G4     = "F1F5F9";
const LIGHT  = "EFF6FF";

// ── 레이아웃 상수 ──────────────────────────────────────────────
const W = 10, H = 5.625;
const MX = 0.4;   // 좌우 여백
const CW = W - MX * 2; // 9.2"

// ── 공통 헬퍼 ─────────────────────────────────────────────────
const makeShadow = () => ({
  type: "outer", blur: 8, offset: 3, angle: 135, color: "1A2F4B", opacity: 0.12
});

// 카드 (흰색 둥근 박스)
function card(sl, x, y, w, h) {
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: WHITE },
    line: { color: "E2E8F0", width: 0.5 },
    shadow: makeShadow(),
    rectRadius: 0.12
  });
}

// 번호 뱃지
function numBadge(sl, n, x, y, bg = BLUE) {
  sl.addShape(pres.shapes.OVAL, {
    x, y, w: 0.46, h: 0.46,
    fill: { color: bg }, line: { color: bg, width: 0 }
  });
  sl.addText(String(n), {
    x, y, w: 0.46, h: 0.46,
    fontSize: 15, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0
  });
}

// 화살표 라인
function arrow(sl, x1, y, x2) {
  sl.addShape(pres.shapes.LINE, {
    x: x1, y, w: x2 - x1, h: 0,
    line: { color: "BFDBFE", width: 1.5, dashType: "dash",
            endArrowType: "triangle" }
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 1 — 표지
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: NAVY };

  // 배경 장식 원
  sl.addShape(pres.shapes.OVAL, {
    x: 7.2, y: -0.8, w: 4.5, h: 4.5,
    fill: { color: "2563EB", transparency: 85 },
    line: { color: "2563EB", width: 0, transparency: 100 }
  });
  sl.addShape(pres.shapes.OVAL, {
    x: -1.2, y: 3.5, w: 3.5, h: 3.5,
    fill: { color: "38BDF8", transparency: 88 },
    line: { color: "38BDF8", width: 0, transparency: 100 }
  });

  // 로고
  sl.addText("pickku", {
    x: 0.7, y: 0.9, w: 6, h: 1.4,
    fontSize: 72, bold: true, color: WHITE,
    fontFace: "Calibri", align: "left", valign: "middle", margin: 0
  });

  // 영어 서브
  sl.addText("Mission Reward Platform", {
    x: 0.72, y: 2.2, w: 6, h: 0.45,
    fontSize: 18, color: "93C5FD",
    fontFace: "Calibri", align: "left", margin: 0
  });

  // 구분선
  sl.addShape(pres.shapes.LINE, {
    x: 0.7, y: 2.85, w: 5.0, h: 0,
    line: { color: "2563EB", width: 1.5 }
  });

  // 태그라인
  sl.addText("기업은 캠페인을 만들고\n유저는 미션을 완료하고\n리워드를 받습니다.", {
    x: 0.72, y: 3.1, w: 5.5, h: 1.6,
    fontSize: 17, color: "CBD5E1",
    fontFace: "Calibri", align: "left", valign: "top",
    lineSpacingMultiple: 1.45, margin: 0
  });

  // 우측 큰 원 장식
  sl.addShape(pres.shapes.OVAL, {
    x: 6.8, y: 1.0, w: 2.9, h: 2.9,
    fill: { color: "2563EB", transparency: 75 },
    line: { color: "60A5FA", width: 1.5 }
  });
  sl.addText("B2B2C\nReward\nPlatform", {
    x: 6.8, y: 1.0, w: 2.9, h: 2.9,
    fontSize: 14, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 1.5
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 2 — pickku는 어떤 플랫폼인가요?
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: WHITE };

  sl.addText("pickku는 어떤 플랫폼인가요?", {
    x: MX, y: 0.32, w: CW, h: 0.55,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });
  sl.addShape(pres.shapes.LINE, {
    x: MX, y: 0.95, w: CW, h: 0,
    line: { color: "E2E8F0", width: 0.8 }
  });

  // 설명 텍스트
  sl.addText(
    "기업이 다양한 미션으로 캠페인을 만들면,\n유저가 미션을 수행하여 포인트나 암호화폐 리워드를 받는 플랫폼입니다.",
    {
      x: MX, y: 1.05, w: 5.0, h: 0.9,
      fontSize: 15, color: G1,
      fontFace: "Calibri", align: "left", valign: "top",
      lineSpacingMultiple: 1.55, margin: 0
    }
  );

  // 3자 구조 다이어그램 (우측)
  const items = [
    { label: "기업\n(캠페인 생성)", color: NAVY, tx: 5.5 },
    { label: "pickku\n(플랫폼)", color: BLUE, tx: 7.1 },
    { label: "유저\n(미션 참여)", color: MINT, tx: 8.7 },
  ];

  items.forEach(({ label, color, tx }) => {
    sl.addShape(pres.shapes.OVAL, {
      x: tx, y: 1.1, w: 1.3, h: 1.3,
      fill: { color }, line: { color, width: 0 }
    });
    sl.addText(label, {
      x: tx, y: 1.1, w: 1.3, h: 1.3,
      fontSize: 11, bold: true, color: WHITE,
      align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 1.3
    });
  });

  // 화살표
  arrow(sl, 6.82, 1.75, 7.12);
  arrow(sl, 8.42, 1.75, 8.72);

  // 3가지 핵심 카드
  const points = [
    { t: "캠페인 기반", d: "기업이 목적에 맞는 캠페인을 만들고\n다양한 미션을 설정합니다.", color: NAVY },
    { t: "미션 수행", d: "유저가 링크 방문, 퀴즈, SNS 팔로우 등\n13가지 미션을 완료합니다.", color: BLUE },
    { t: "자동 추첨 & 리워드", d: "캠페인 종료 후 자동으로 당첨자를\n선정하고 리워드를 지급합니다.", color: MINT },
  ];

  points.forEach(({ t, d, color }, i) => {
    const cx = MX + i * 3.08;
    const cy = 2.35;
    card(sl, cx, cy, 2.85, 2.85);
    sl.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy, w: 2.85, h: 0.09,
      fill: { color }, line: { color, width: 0 }
    });
    sl.addText(t, {
      x: cx + 0.18, y: cy + 0.2, w: 2.5, h: 0.42,
      fontSize: 14, bold: true, color,
      fontFace: "Calibri", margin: 0
    });
    sl.addText(d, {
      x: cx + 0.18, y: cy + 0.72, w: 2.5, h: 1.6,
      fontSize: 12, color: G2,
      fontFace: "Calibri", lineSpacingMultiple: 1.5, margin: 0
    });
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 3 — 이렇게 돌아가요 (전체 흐름)
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: G4 };

  sl.addText("이렇게 돌아가요", {
    x: MX, y: 0.32, w: CW, h: 0.55,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });

  // 흐름도 5단계
  const steps = [
    { n: 1, title: "캠페인 생성", body: "기업이 미션 목록,\n리워드, 기간을\n설정합니다", color: NAVY },
    { n: 2, title: "Admin 승인", body: "플랫폼 관리자가\n캠페인을\n검토·승인합니다", color: "475569" },
    { n: 3, title: "미션 수행", body: "유저가 미션을\n하나씩 완료하고\n제출합니다", color: BLUE },
    { n: 4, title: "자동 추첨", body: "종료 후 서버가\n당첨자를\n자동 선정합니다", color: MINT },
    { n: 5, title: "리워드 지급", body: "포인트 또는 암호화폐가\n당첨자 지갑으로\n전송됩니다", color: AMBER },
  ];

  const startX = 0.38, boxW = 1.72, gap = 0.18;

  steps.forEach(({ n, title, body, color }, i) => {
    const cx = startX + i * (boxW + gap);

    // 카드
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: 1.08, w: boxW, h: 3.8,
      fill: { color: WHITE },
      line: { color: "E2E8F0", width: 0.5 },
      shadow: makeShadow(), rectRadius: 0.1
    });
    // 상단 색 바
    sl.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.08, w: boxW, h: 0.38,
      fill: { color }, line: { color, width: 0 }
    });
    // 번호
    sl.addShape(pres.shapes.OVAL, {
      x: cx + boxW / 2 - 0.3, y: 1.28, w: 0.6, h: 0.6,
      fill: { color: WHITE }, line: { color: WHITE, width: 0 }
    });
    sl.addText(String(n), {
      x: cx + boxW / 2 - 0.3, y: 1.28, w: 0.6, h: 0.6,
      fontSize: 16, bold: true, color,
      align: "center", valign: "middle", margin: 0
    });
    // 제목
    sl.addText(title, {
      x: cx + 0.1, y: 2.05, w: boxW - 0.2, h: 0.45,
      fontSize: 13, bold: true, color: NAVY,
      fontFace: "Calibri", align: "center", margin: 0
    });
    // 본문
    sl.addText(body, {
      x: cx + 0.1, y: 2.6, w: boxW - 0.2, h: 1.8,
      fontSize: 12, color: G2,
      fontFace: "Calibri", align: "center", lineSpacingMultiple: 1.5, margin: 0
    });

    // 화살표 (마지막 제외)
    if (i < steps.length - 1) {
      sl.addShape(pres.shapes.LINE, {
        x: cx + boxW, y: 3.0, w: gap, h: 0,
        line: { color: G3, width: 1.5, endArrowType: "triangle" }
      });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 4 — 유저 입장에서
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: WHITE };

  sl.addText("유저 입장에서", {
    x: MX, y: 0.32, w: CW, h: 0.55,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });
  sl.addShape(pres.shapes.LINE, {
    x: MX, y: 0.95, w: CW, h: 0,
    line: { color: "E2E8F0", width: 0.8 }
  });

  // 왼쪽 — 유저가 하는 일
  sl.addText("유저가 하는 일", {
    x: MX, y: 1.1, w: 4.3, h: 0.4,
    fontSize: 15, bold: true, color: BLUE,
    fontFace: "Calibri", margin: 0
  });

  const doItems = [
    "관심 있는 캠페인을 탐색합니다",
    "링크 방문, 퀴즈, SNS 참여 등 다양한 미션을 수행합니다",
    "완료한 미션을 제출하고 검증을 기다립니다",
    "모든 미션을 완료하면 추첨 대상이 됩니다",
  ];
  doItems.forEach((t, i) => {
    numBadge(sl, i + 1, MX, 1.65 + i * 0.78, BLUE);
    sl.addText(t, {
      x: MX + 0.58, y: 1.62 + i * 0.78, w: 3.72, h: 0.46,
      fontSize: 13, color: G1,
      fontFace: "Calibri", valign: "middle", margin: 0
    });
  });

  // 중앙 구분선
  sl.addShape(pres.shapes.LINE, {
    x: 4.9, y: 1.1, w: 0, h: 4.1,
    line: { color: "E2E8F0", width: 1 }
  });

  // 오른쪽 — 유저가 얻는 것
  sl.addText("유저가 얻는 것", {
    x: 5.2, y: 1.1, w: 4.4, h: 0.4,
    fontSize: 15, bold: true, color: MINT,
    fontFace: "Calibri", margin: 0
  });

  const getItems = [
    { title: "포인트 & 암호화폐 리워드", desc: "당첨 시 POINT, USDT, BRL, METAQ 중\n한 가지 이상의 리워드를 받습니다." },
    { title: "공정한 추첨 시스템", desc: "모든 과정이 서버 알고리즘으로 투명하게 처리됩니다." },
    { title: "다양한 캠페인 참여", desc: "여러 기업의 캠페인에 동시에 참여할 수 있습니다." },
  ];

  getItems.forEach(({ title, desc }, i) => {
    card(sl, 5.2, 1.65 + i * 1.22, 4.4, 1.05);
    sl.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: 1.65 + i * 1.22, w: 0.07, h: 1.05,
      fill: { color: MINT }, line: { color: MINT, width: 0 }
    });
    sl.addText(title, {
      x: 5.36, y: 1.68 + i * 1.22, w: 4.06, h: 0.34,
      fontSize: 13, bold: true, color: NAVY,
      fontFace: "Calibri", margin: 0
    });
    sl.addText(desc, {
      x: 5.36, y: 2.03 + i * 1.22, w: 4.06, h: 0.56,
      fontSize: 11.5, color: G2,
      fontFace: "Calibri", lineSpacingMultiple: 1.4, margin: 0
    });
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 5 — 기업 입장에서
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: WHITE };

  sl.addText("기업 입장에서", {
    x: MX, y: 0.32, w: CW, h: 0.55,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });
  sl.addShape(pres.shapes.LINE, {
    x: MX, y: 0.95, w: CW, h: 0,
    line: { color: "E2E8F0", width: 0.8 }
  });

  // 왼쪽 — 기업이 하는 일
  sl.addText("기업이 하는 일", {
    x: MX, y: 1.1, w: 4.3, h: 0.4,
    fontSize: 15, bold: true, color: NAVY,
    fontFace: "Calibri", margin: 0
  });

  const doItems = [
    "캠페인 목표와 미션을 설정합니다",
    "리워드 금액과 당첨자 수를 결정합니다",
    "참여자 제출 내역을 검토·승인합니다",
    "추첨 완료 후 당첨자 데이터를 확인합니다",
  ];
  doItems.forEach((t, i) => {
    numBadge(sl, i + 1, MX, 1.65 + i * 0.78, NAVY);
    sl.addText(t, {
      x: MX + 0.58, y: 1.62 + i * 0.78, w: 3.72, h: 0.46,
      fontSize: 13, color: G1,
      fontFace: "Calibri", valign: "middle", margin: 0
    });
  });

  // 중앙 구분선
  sl.addShape(pres.shapes.LINE, {
    x: 4.9, y: 1.1, w: 0, h: 4.1,
    line: { color: "E2E8F0", width: 1 }
  });

  // 오른쪽 — 기업이 얻는 것
  sl.addText("기업이 얻는 것", {
    x: 5.2, y: 1.1, w: 4.4, h: 0.4,
    fontSize: 15, bold: true, color: AMBER,
    fontFace: "Calibri", margin: 0
  });

  const getItems = [
    { title: "타겟 마케팅 채널", desc: "SNS 팔로우, 영상 시청 등 원하는 행동을 유도하는 정밀 캠페인을 운영합니다." },
    { title: "참여자 데이터 확보", desc: "이메일, 국가, 성별, SNS 정보 등 동의 기반\n참여자 데이터를 엑셀로 내보낼 수 있습니다." },
    { title: "브랜드 인지도 확대", desc: "다양한 미션을 통해 유저가 브랜드를 직접 경험하도록 유도합니다." },
  ];

  getItems.forEach(({ title, desc }, i) => {
    card(sl, 5.2, 1.65 + i * 1.22, 4.4, 1.05);
    sl.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: 1.65 + i * 1.22, w: 0.07, h: 1.05,
      fill: { color: AMBER }, line: { color: AMBER, width: 0 }
    });
    sl.addText(title, {
      x: 5.36, y: 1.68 + i * 1.22, w: 4.06, h: 0.34,
      fontSize: 13, bold: true, color: NAVY,
      fontFace: "Calibri", margin: 0
    });
    sl.addText(desc, {
      x: 5.36, y: 2.03 + i * 1.22, w: 4.06, h: 0.56,
      fontSize: 11.5, color: G2,
      fontFace: "Calibri", lineSpacingMultiple: 1.4, margin: 0
    });
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 6 — 13가지 미션 종류
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: G4 };

  sl.addText("13가지 미션 종류", {
    x: MX, y: 0.28, w: CW, h: 0.5,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });
  sl.addText("기업은 목적에 맞게 미션을 조합하여 캠페인을 구성합니다", {
    x: MX, y: 0.8, w: CW, h: 0.32,
    fontSize: 13, color: G2,
    fontFace: "Calibri", align: "left", margin: 0
  });

  const categories = [
    {
      cat: "일반", color: NAVY,
      missions: ["링크 방문", "코드 입력", "퀴즈", "설문 조사", "체크인", "파일 업로드"]
    },
    {
      cat: "YouTube", color: "DC2626",
      missions: ["동영상 시청", "채널 구독", "좋아요"]
    },
    {
      cat: "Telegram", color: "0284C7",
      missions: ["채널 참여", "그룹 참여"]
    },
    {
      cat: "Discord", color: "5865F2",
      missions: ["서버 참여"]
    },
    {
      cat: "Instagram", color: "DB2777",
      missions: ["팔로우", "좋아요"]
    },
  ];

  // 2행 레이아웃
  const cols = [0, 1, 2, 3, 4];
  const colX = [MX, 2.25, 4.1, 6.24, 7.96];
  const colW = [1.73, 1.73, 2.02, 1.6, 1.85];

  categories.forEach(({ cat, color, missions }, ci) => {
    const x = colX[ci], cw = colW[ci], y = 1.3;

    // 헤더
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: cw, h: 0.4,
      fill: { color }, line: { color, width: 0 }, rectRadius: 0.06
    });
    sl.addText(cat, {
      x, y, w: cw, h: 0.4,
      fontSize: 12, bold: true, color: WHITE,
      fontFace: "Calibri", align: "center", valign: "middle", margin: 0
    });

    // 미션 칩들
    missions.forEach((m, mi) => {
      const my = y + 0.52 + mi * 0.52;
      sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: x + 0.04, y: my, w: cw - 0.08, h: 0.4,
        fill: { color: WHITE },
        line: { color, width: 0.8 },
        rectRadius: 0.06
      });
      sl.addText(m, {
        x: x + 0.04, y: my, w: cw - 0.08, h: 0.4,
        fontSize: 11.5, color: G1,
        fontFace: "Calibri", align: "center", valign: "middle", margin: 0
      });
    });
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 7 — 리워드 종류
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: WHITE };

  sl.addText("리워드 종류", {
    x: MX, y: 0.32, w: CW, h: 0.55,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });
  sl.addShape(pres.shapes.LINE, {
    x: MX, y: 0.95, w: CW, h: 0,
    line: { color: "E2E8F0", width: 0.8 }
  });

  const rewards = [
    {
      name: "POINT",
      sub: "플랫폼 포인트",
      desc: "pickku 내 포인트로 적립됩니다.\n랭킹 및 이벤트에 활용되며\n만료 기간이 있습니다.",
      color: BLUE, bg: "EFF6FF"
    },
    {
      name: "USDT",
      sub: "USD 테더",
      desc: "달러 기반 스테이블코인입니다.\n유저의 지갑 주소로\n직접 전송됩니다.",
      color: "059669", bg: "ECFDF5"
    },
    {
      name: "BRL",
      sub: "브라질 헤알",
      desc: "브라질 법정통화 기반 리워드입니다.\n지정된 결제 방식으로\n지급됩니다.",
      color: "B45309", bg: "FFFBEB"
    },
    {
      name: "METAQ",
      sub: "METAQ 토큰",
      desc: "블록체인 기반 토큰입니다.\n유저의 블록체인 지갑으로\n직접 전송됩니다.",
      color: "7C3AED", bg: "F5F3FF"
    },
  ];

  rewards.forEach(({ name, sub, desc, color, bg }, i) => {
    const cx = MX + i * 2.35;
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: 1.1, w: 2.18, h: 3.9,
      fill: { color: bg }, line: { color, width: 1 },
      shadow: makeShadow(), rectRadius: 0.12
    });
    // 상단 아이콘 원
    sl.addShape(pres.shapes.OVAL, {
      x: cx + 0.64, y: 1.3, w: 0.9, h: 0.9,
      fill: { color }, line: { color, width: 0 }
    });
    sl.addText(name.charAt(0), {
      x: cx + 0.64, y: 1.3, w: 0.9, h: 0.9,
      fontSize: 22, bold: true, color: WHITE,
      align: "center", valign: "middle", margin: 0
    });
    sl.addText(name, {
      x: cx + 0.1, y: 2.35, w: 1.98, h: 0.4,
      fontSize: 18, bold: true, color,
      fontFace: "Calibri", align: "center", margin: 0
    });
    sl.addText(sub, {
      x: cx + 0.1, y: 2.78, w: 1.98, h: 0.3,
      fontSize: 11, color: G3,
      fontFace: "Calibri", align: "center", margin: 0
    });
    sl.addShape(pres.shapes.LINE, {
      x: cx + 0.25, y: 3.16, w: 1.68, h: 0,
      line: { color, width: 0.5 }
    });
    sl.addText(desc, {
      x: cx + 0.12, y: 3.25, w: 1.94, h: 1.5,
      fontSize: 11.5, color: G2,
      fontFace: "Calibri", align: "center", lineSpacingMultiple: 1.5, margin: 0
    });
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 8 — 가치 교환 구조
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: G4 };

  sl.addText("세 주체가 만드는 선순환 구조", {
    x: MX, y: 0.28, w: CW, h: 0.5,
    fontSize: 26, bold: true, color: NAVY,
    fontFace: "Calibri", align: "left", margin: 0
  });

  // 중앙 pickku 원
  sl.addShape(pres.shapes.OVAL, {
    x: 3.9, y: 1.8, w: 2.2, h: 2.2,
    fill: { color: NAVY }, line: { color: NAVY, width: 0 },
    shadow: makeShadow()
  });
  sl.addText("pickku\n플랫폼", {
    x: 3.9, y: 1.8, w: 2.2, h: 2.2,
    fontSize: 16, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 1.4
  });

  // 기업 카드 (좌측)
  card(sl, 0.25, 1.55, 2.9, 2.7);
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.25, y: 1.55, w: 2.9, h: 0.08,
    fill: { color: AMBER }, line: { color: AMBER, width: 0 }
  });
  sl.addText("기업", {
    x: 0.25, y: 1.68, w: 2.9, h: 0.42,
    fontSize: 16, bold: true, color: NAVY,
    fontFace: "Calibri", align: "center", margin: 0
  });
  sl.addText([
    { text: "제공  ", options: { bold: true, color: AMBER } },
    { text: "캠페인·미션 설계\n리워드 예산", options: { color: G2 } }
  ], {
    x: 0.35, y: 2.18, w: 2.7, h: 0.7,
    fontSize: 12, fontFace: "Calibri", lineSpacingMultiple: 1.4, margin: 0
  });
  sl.addText([
    { text: "획득  ", options: { bold: true, color: MINT } },
    { text: "타겟 마케팅 효과\n유저 데이터·인사이트", options: { color: G2 } }
  ], {
    x: 0.35, y: 2.98, w: 2.7, h: 0.7,
    fontSize: 12, fontFace: "Calibri", lineSpacingMultiple: 1.4, margin: 0
  });

  // 유저 카드 (우측)
  card(sl, 6.85, 1.55, 2.9, 2.7);
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 6.85, y: 1.55, w: 2.9, h: 0.08,
    fill: { color: BLUE }, line: { color: BLUE, width: 0 }
  });
  sl.addText("유저", {
    x: 6.85, y: 1.68, w: 2.9, h: 0.42,
    fontSize: 16, bold: true, color: NAVY,
    fontFace: "Calibri", align: "center", margin: 0
  });
  sl.addText([
    { text: "제공  ", options: { bold: true, color: AMBER } },
    { text: "미션 수행·참여\nSNS 행동", options: { color: G2 } }
  ], {
    x: 6.95, y: 2.18, w: 2.7, h: 0.7,
    fontSize: 12, fontFace: "Calibri", lineSpacingMultiple: 1.4, margin: 0
  });
  sl.addText([
    { text: "획득  ", options: { bold: true, color: MINT } },
    { text: "포인트·암호화폐\n공정한 추첨 기회", options: { color: G2 } }
  ], {
    x: 6.95, y: 2.98, w: 2.7, h: 0.7,
    fontSize: 12, fontFace: "Calibri", lineSpacingMultiple: 1.4, margin: 0
  });

  // 화살표들
  // 기업 → pickku
  sl.addShape(pres.shapes.LINE, {
    x: 3.15, y: 2.38, w: 0.78, h: 0,
    line: { color: AMBER, width: 1.5, endArrowType: "triangle" }
  });
  // pickku → 기업
  sl.addShape(pres.shapes.LINE, {
    x: 3.15, y: 2.65, w: 0.78, h: 0,
    line: { color: MINT, width: 1.5, beginArrowType: "triangle" }
  });
  // pickku → 유저
  sl.addShape(pres.shapes.LINE, {
    x: 6.1, y: 2.38, w: 0.78, h: 0,
    line: { color: BLUE, width: 1.5, endArrowType: "triangle" }
  });
  // 유저 → pickku
  sl.addShape(pres.shapes.LINE, {
    x: 6.1, y: 2.65, w: 0.78, h: 0,
    line: { color: MINT, width: 1.5, beginArrowType: "triangle" }
  });

  // 하단 한줄 요약
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: MX, y: 4.9, w: CW, h: 0.52,
    fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.08
  });
  sl.addText(
    "기업의 마케팅 목표  +  유저의 리워드 욕구  =  pickku가 연결합니다",
    {
      x: MX, y: 4.9, w: CW, h: 0.52,
      fontSize: 13.5, bold: true, color: WHITE,
      fontFace: "Calibri", align: "center", valign: "middle", margin: 0
    }
  );
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 9 — 마무리
// ══════════════════════════════════════════════════════════════
{
  const sl = pres.addSlide();
  sl.background = { color: NAVY };

  // 배경 장식
  sl.addShape(pres.shapes.OVAL, {
    x: 6.5, y: -0.5, w: 5, h: 5,
    fill: { color: "2563EB", transparency: 88 },
    line: { color: "2563EB", width: 0, transparency: 100 }
  });

  sl.addText("pickku", {
    x: 0.7, y: 1.0, w: 5, h: 1.1,
    fontSize: 60, bold: true, color: WHITE,
    fontFace: "Calibri", margin: 0
  });
  sl.addText("Mission Reward Platform", {
    x: 0.74, y: 2.05, w: 5, h: 0.4,
    fontSize: 16, color: "93C5FD",
    fontFace: "Calibri", margin: 0
  });
  sl.addShape(pres.shapes.LINE, {
    x: 0.7, y: 2.6, w: 4.5, h: 0,
    line: { color: "2563EB", width: 1.5 }
  });

  // 3줄 요약
  const summary = [
    "기업은 원하는 행동을 미션으로 설계합니다",
    "유저는 미션을 수행하고 실질적인 보상을 받습니다",
    "pickku는 이 두 가지를 자동화된 플랫폼으로 연결합니다",
  ];
  summary.forEach((t, i) => {
    sl.addShape(pres.shapes.OVAL, {
      x: 0.7, y: 2.85 + i * 0.6, w: 0.28, h: 0.28,
      fill: { color: "2563EB" }, line: { color: "2563EB", width: 0 }
    });
    sl.addText(t, {
      x: 1.1, y: 2.82 + i * 0.6, w: 4.2, h: 0.36,
      fontSize: 13, color: "CBD5E1",
      fontFace: "Calibri", valign: "middle", margin: 0
    });
  });
}

// ── 저장 ──────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\Code7\\work\\Rewardplatform\\pickku_소개서.pptx" })
  .then(() => console.log("pickku_소개서.pptx 생성 완료."))
  .catch(e => { console.error(e); process.exit(1); });
