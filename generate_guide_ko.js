const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TabStopType, TabStopPosition
} = require("docx");
const fs = require("fs");

// ── Palette ──────────────────────────────────────────────────
const NAVY   = "1A2F4B";
const BLUE   = "2563EB";
const SKY    = "38BDF8";
const MINT   = "10B981";
const AMBER  = "F59E0B";
const RED    = "EF4444";
const WHITE  = "FFFFFF";
const PALE   = "EFF6FF";
const LIGHT  = "DBEAFE";
const G1     = "1E293B";
const G2     = "475569";
const G3     = "94A3B8";
const G4     = "E2E8F0";
const ORANGE = "EA580C";

// ── Page ─────────────────────────────────────────────────────
const PAGE_W   = 11906;
const PAGE_H   = 16838;
const MARGIN   = 1080;
const CONTENT  = PAGE_W - MARGIN * 2; // 9746

// ── Borders ──────────────────────────────────────────────────
const b  = (c = G4, s = 4) => ({ style: BorderStyle.SINGLE, size: s, color: c });
const bs = (c = G4) => ({ top: b(c), bottom: b(c), left: b(c), right: b(c) });
const bNone = () => ({ style: BorderStyle.NONE, size: 0, color: WHITE });
const bsNone = () => ({ top: bNone(), bottom: bNone(), left: bNone(), right: bNone() });

// ── Text helpers ─────────────────────────────────────────────
const run  = (text, opts = {}) => new TextRun({ text, font: "맑은 고딕", size: 22, color: G1, ...opts });
const bold = (text, opts = {}) => run(text, { bold: true, ...opts });
const sp   = (n = 1) => new Paragraph({ children: [new TextRun({ text: "", size: n * 10 })] });

// ── Paragraph helpers ────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: BLUE, space: 6 } },
    children: [new TextRun({ text, font: "맑은 고딕", size: 36, bold: true, color: NAVY })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, font: "맑은 고딕", size: 28, bold: true, color: BLUE })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, font: "맑은 고딕", size: 24, bold: true, color: NAVY })]
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, font: "맑은 고딕", size: 22, color: G1, ...opts })]
  });
}
function note(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    indent: { left: 400 },
    children: [
      new TextRun({ text: "참고  ", font: "맑은 고딕", size: 22, bold: true, color: SKY }),
      new TextRun({ text, font: "맑은 고딕", size: 20, color: G2, italics: true })
    ]
  });
}
function warn(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    indent: { left: 400 },
    children: [
      new TextRun({ text: "주의  ", font: "맑은 고딕", size: 22, bold: true, color: AMBER }),
      new TextRun({ text, font: "맑은 고딕", size: 20, color: ORANGE })
    ]
  });
}
function bullet(text, bold_prefix = null) {
  const ch = [];
  if (bold_prefix) ch.push(new TextRun({ text: bold_prefix + " ", font: "맑은 고딕", size: 22, bold: true, color: NAVY }));
  ch.push(new TextRun({ text, font: "맑은 고딕", size: 22, color: G1 }));
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 50 },
    children: ch
  });
}
function numbered(text, ref = "nums") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 50, after: 60 },
    children: [new TextRun({ text, font: "맑은 고딕", size: 22, color: G1 })]
  });
}

// ── Divider ──────────────────────────────────────────────────
function divider(color = LIGHT) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color, space: 2 } },
    children: [new TextRun({ text: "" })]
  });
}

// ── Colored header paragraph (section label) ─────────────────
function sectionBadge(text, bg = NAVY) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT, type: WidthType.DXA },
      borders: bsNone(),
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text, font: "맑은 고딕", size: 28, bold: true, color: WHITE })]
      })]
    })] })]
  });
}

// ── Info box (colored bg) ────────────────────────────────────
function infoBox(rows_content, bg = PALE, borderColor = BLUE) {
  const children = rows_content.map(r =>
    new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: r, font: "맑은 고딕", size: 21, color: G1 })] })
  );
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT, type: WidthType.DXA },
      borders: { top: b(borderColor, 8), bottom: b(borderColor, 8), left: b(borderColor, 8), right: b(borderColor, 8) },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 240, right: 240 },
      children
    })] })]
  });
}

// ── Step box ─────────────────────────────────────────────────
function stepBox(stepNum, title, lines) {
  const children = [
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [
      new TextRun({ text: `Step ${stepNum}  `, font: "맑은 고딕", size: 20, bold: true, color: WHITE }),
      new TextRun({ text: title, font: "맑은 고딕", size: 24, bold: true, color: WHITE })
    ]}),
    ...lines.map(l => new Paragraph({ spacing: { before: 30, after: 30 }, children: [
      new TextRun({ text: "- " + l, font: "맑은 고딕", size: 21, color: "D0E8F7" })
    ]}))
  ];
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT, type: WidthType.DXA },
      borders: bsNone(),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 260, right: 260 },
      children
    })] })]
  });
}

// ── 2-col table ──────────────────────────────────────────────
function twoColTable(headers, rows, w1 = 3800) {
  const w2 = CONTENT - w1;
  const hdr_row = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: i === 0 ? w1 : w2, type: WidthType.DXA },
      borders: bs(BLUE),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: "맑은 고딕", size: 20, bold: true, color: WHITE })] })]
    }))
  });
  const data_rows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: ci === 0 ? w1 : w2, type: WidthType.DXA },
      borders: bs(G4),
      shading: { fill: ri % 2 === 0 ? WHITE : PALE, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 140, right: 140 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: "맑은 고딕", size: 21, color: G1 })] })]
    }))
  }));
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [w1, w2],
    rows: [hdr_row, ...data_rows]
  });
}

// ── Mission detail table ──────────────────────────────────────
function missionTable(rows) {
  const W = [700, 2400, 3300, 3346];
  const hdrs = ["유형", "미션 종류", "사용자가 해야 할 일", "검증 방법"];
  const hdr_row = new TableRow({
    tableHeader: true,
    children: hdrs.map((h, i) => new TableCell({
      width: { size: W[i], type: WidthType.DXA },
      borders: bs(BLUE),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: "맑은 고딕", size: 20, bold: true, color: WHITE })] })]
    }))
  });
  const data_rows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: W[ci], type: WidthType.DXA },
      borders: bs(G4),
      shading: { fill: ri % 2 === 0 ? WHITE : PALE, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: cell, font: "맑은 고딕", size: ci === 0 ? 22 : 21, color: G1 })]
      })]
    }))
  }));
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: W,
    rows: [hdr_row, ...data_rows]
  });
}

// ── Footer ────────────────────────────────────────────────────
function makeFooter() {
  return new Footer({ children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
      spacing: { before: 100 },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: "pickku -- 이용 가이드  ", font: "맑은 고딕", size: 16, color: BLUE }),
        new TextRun({ text: "\t", font: "맑은 고딕", size: 16 }),
        new TextRun({ text: "페이지 ", font: "맑은 고딕", size: 16, color: G3 }),
        new TextRun({ children: [PageNumber.CURRENT], font: "맑은 고딕", size: 16, color: G3 }),
      ]
    })
  ]});
}

// ════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ════════════════════════════════════════════════════════════════
const children = [];
const P = (...items) => items.forEach(i => children.push(i));

// ── 표지 ────────────────────────────────────────────────────
P(
  sp(10),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: "pickku", font: "맑은 고딕", size: 120, bold: true, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 180 },
    children: [new TextRun({ text: "미션 리워드 플랫폼", font: "맑은 고딕", size: 40, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 },
               bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text: "미션을 완료하고 리워드를 받으세요.", font: "맑은 고딕", size: 32, color: G2, italics: true })] }),
  sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: "공식 이용 가이드", font: "맑은 고딕", size: 26, bold: true, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "기업(캠페인 운영자) & 참여자(유저) 공통  |  2026", font: "맑은 고딕", size: 22, color: G3 })] }),
  sp(2),
  new Paragraph({ children: [new PageBreak()] })
);

// ── 목차 ─────────────────────────────────────────────────────
P(
  h1("목차"),
  sp(1),
  ...([
    ["1.", "플랫폼 개요", "3"],
    ["2.", "시작하기 -- 회원가입 및 프로필 설정", "4"],
    ["3.", "참여자(유저) 가이드", "6"],
    ["  3.1", "캠페인 찾기 및 참여", "6"],
    ["  3.2", "미션 수행", "8"],
    ["  3.3", "SNS 계정 연동", "13"],
    ["  3.4", "마이페이지 -- 프로필 & 활동 내역", "15"],
    ["4.", "기업(캠페인 매니저) 가이드", "17"],
    ["  4.1", "매니저 권한 신청", "17"],
    ["  4.2", "캠페인 만들기 (단계별 안내)", "17"],
    ["  4.3", "미션 설정 가이드", "21"],
    ["  4.4", "캠페인 관리", "27"],
    ["  4.5", "제출 검토 및 추첨 실행", "28"],
    ["  4.6", "참여자 데이터 내보내기", "30"],
    ["5.", "포인트 & 리워드", "31"],
    ["6.", "자주 묻는 질문 (FAQ)", "32"],
  ].map(([n, t, pg]) => new Paragraph({
    spacing: { before: 60, after: 60 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: n + "  " + t, font: "맑은 고딕", size: 22, color: n.trim().length <= 2 ? NAVY : G2, bold: n.trim().length <= 2 }),
      new TextRun({ text: "\t" + pg, font: "맑은 고딕", size: 22, color: G3 }),
    ]
  }))),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// 1장 -- 플랫폼 개요
// ════════════════════════════════════════════════════════════════
P(
  h1("1. 플랫폼 개요"),
  body("pickku는 B2B2C 미션 기반 리워드 캠페인 플랫폼입니다. 기업이 다양한 미션으로 구성된 캠페인을 만들고, 유저가 미션을 완료하여 포인트 및 리워드를 받을 수 있습니다."),
  sp(1),
  twoColTable(
    ["역할", "설명"],
    [
      ["기업 (매니저)", "리워드 캠페인을 생성하고 관리합니다. 미션, 상금, 추첨 방식을 설정합니다."],
      ["유저 (참여자)", "캠페인을 탐색하고, 미션을 수행하여 포인트 또는 암호화폐 리워드를 얻습니다."],
      ["관리자 (Admin)", "플랫폼 전체를 관리하고 캠페인을 승인합니다."],
    ], 3200
  ),
  sp(1),
  h2("이용 흐름 한눈에 보기"),
  infoBox([
    "1.  기업이 캠페인을 생성하고 미션을 설정합니다. (예: 링크 방문, 퀴즈 풀기, 디스코드 서버 참여 등)",
    "2.  관리자(Admin) 승인 후 캠페인이 공개됩니다.",
    "3.  유저가 활성 캠페인을 탐색하고 미션을 완료한 뒤 제출합니다.",
    "4.  캠페인 종료 후 추첨을 통해 당첨자가 선정되고 포인트 또는 암호화폐 리워드가 지급됩니다.",
    "5.  미션 검증부터 리워드 지급까지 전 과정이 자동화되어 있습니다.",
  ], PALE, BLUE),
  sp(1),
  h2("지원 언어"),
  body("pickku는 영어, 한국어, 포르투갈어(Portugues)를 지원합니다. 상단 내비게이션 바에서 언제든지 언어를 변경할 수 있습니다."),
  sp(1),
  h2("지원 리워드 유형"),
  twoColTable(
    ["통화", "설명"],
    [
      ["POINT",  "플랫폼 포인트 -- 랭킹 및 향후 리워드 교환에 사용됩니다."],
      ["USDT",   "USD 테더 스테이블코인 -- 등록된 지갑 주소로 전송됩니다."],
      ["BRL",    "브라질 헤알 -- 지정된 결제 방식으로 지급됩니다."],
      ["METAQ",  "METAQ 토큰 -- 등록된 블록체인 지갑 주소로 전송됩니다."],
    ], 2400
  ),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// 2장 -- 시작하기
// ════════════════════════════════════════════════════════════════
P(
  h1("2. 시작하기 -- 회원가입 및 프로필 설정"),
  body("캠페인에 참여하거나 생성하려면 먼저 계정을 만들고 프로필을 완성해야 합니다."),
  sp(1),

  h2("2.1  회원가입"),
  body("상단 내비게이션 바에서 [회원가입]을 클릭하세요. 다음 방법으로 가입할 수 있습니다:"),
  bullet("이메일 & 비밀번호 (최소 6자)", null),
  bullet("Google 계정 (원클릭 OAuth 로그인)", null),
  sp(1),
  note("Google 계정으로 가입하면 바로 프로필 설정 페이지로 이동합니다."),
  sp(1),

  h2("2.2  프로필 완성 (필수)"),
  warn("프로필을 완성하기 전에는 어떠한 캠페인에도 참여할 수 없습니다. 프로필이 미완성인 경우 플랫폼이 자동으로 계정 설정 페이지로 리다이렉트합니다."),
  sp(1),
  body("계정 설정 페이지에서 아래 항목을 모두 입력하세요:"),
  sp(1),
  twoColTable(
    ["항목", "안내"],
    [
      ["닉네임",       "플랫폼에서 표시될 이름입니다."],
      ["지갑 주소",    "블록체인 지갑 주소 (예: 0x1234...)입니다. 암호화폐 리워드 수령 시 필수입니다."],
      ["생년월일",     "연령대 분석에 사용됩니다. 형식: YYYY-MM-DD"],
      ["성별",         "남성(Male) 또는 여성(Female)"],
      ["국가",         "드롭다운에서 국가를 선택합니다. (40개국 이상)"],
    ], 3000
  ),
  sp(1),
  note("지갑 주소는 반드시 0x로 시작하는 올바른 형식이어야 합니다. 리워드가 이 주소로 직접 전송되므로 정확히 입력하세요."),
  sp(1),
  body("모든 항목을 저장하면 홈 페이지로 이동하며 캠페인 탐색을 시작할 수 있습니다."),
  sp(1),

  h2("2.3  로그인"),
  body("로그인 페이지에서 이메일과 비밀번호를 입력하거나 [Google로 로그인] 버튼을 사용하세요. 로그인 후 홈 페이지로 이동합니다."),
  sp(1),
  body("로그인 토큰은 브라우저에 저장됩니다. 내비게이션 메뉴에서 [로그아웃]을 클릭하기 전까지 로그인 상태가 유지됩니다."),
  sp(1),

  h2("2.4  내비게이션 메뉴 안내"),
  twoColTable(
    ["메뉴", "설명"],
    [
      ["홈",       "플랫폼 메인 페이지. 추천 캠페인과 빠른 시작 가이드를 볼 수 있습니다."],
      ["캠페인",   "활성, 예정, 종료된 캠페인 전체 목록"],
      ["마이페이지", "내 프로필, SNS 연동 계정, 활동 내역"],
      ["Ops",      "캠페인 관리 콘솔 (매니저만 표시)"],
      ["Admin",    "관리자 대시보드 (관리자만 표시)"],
      ["로그아웃", "계정 로그아웃"],
    ], 2600
  ),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// 3장 -- 참여자 가이드
// ════════════════════════════════════════════════════════════════
P(
  sectionBadge("3장  --  참여자(유저) 가이드"),
  sp(1),
  h1("3. 참여자(유저) 가이드"),
  body("이 장에서는 캠페인을 찾아 참여하고, 미션을 수행하여 리워드를 받는 방법을 설명합니다."),
  sp(1),

  // 3.1
  h2("3.1  캠페인 찾기 및 참여"),
  body("상단 내비게이션 바에서 [캠페인]을 클릭하면 모든 캠페인 목록을 볼 수 있습니다."),
  sp(1),

  h3("캠페인 목록 둘러보기"),
  body("각 캠페인 카드에는 다음 정보가 표시됩니다:"),
  bullet("캠페인 제목 및 기업명/로고", null),
  bullet("상태 배지 -- 활성 / 마감 임박 / 예정 / 종료", null),
  bullet("미션 수", null),
  bullet("현재 참여자 수", null),
  bullet("당첨자 1인당 리워드", null),
  bullet("캠페인 종료일", null),
  sp(1),

  h3("필터 및 정렬"),
  twoColTable(
    ["옵션", "설명"],
    [
      ["검색",        "캠페인 제목 또는 설명으로 검색합니다."],
      ["전체 상태",   "상태에 관계없이 모든 캠페인을 표시합니다."],
      ["활성",        "현재 참여 가능한 캠페인만 표시합니다."],
      ["예정",        "아직 시작되지 않은 캠페인을 표시합니다."],
      ["종료",        "완료된 캠페인을 표시합니다."],
      ["최신순",      "최근에 생성된 캠페인 순으로 정렬합니다."],
      ["마감 임박순", "종료일이 가장 가까운 캠페인 순으로 정렬합니다."],
    ], 2800
  ),
  sp(1),

  h3("캠페인 상태 설명"),
  twoColTable(
    ["상태", "의미"],
    [
      ["[활성]  Active",         "캠페인이 진행 중입니다. 지금 바로 참여하고 미션을 완료하세요."],
      ["[임박]  Ending Soon",    "3일 이내에 캠페인이 종료됩니다. 서둘러 미션을 완료하세요!"],
      ["[예정]  Upcoming",       "아직 시작되지 않은 캠페인입니다. 나중에 다시 확인하세요."],
      ["[종료]  Closed",         "캠페인이 종료되었습니다. 더 이상 제출할 수 없습니다."],
    ], 3000
  ),
  sp(1),

  h3("캠페인 상세 페이지"),
  body("캠페인 카드에서 [상세 보기]를 클릭하면 캠페인 상세 페이지로 이동합니다. 여기서 다음 내용을 확인할 수 있습니다:"),
  bullet("캠페인 제목, 기업 로고, 전체 설명", null),
  bullet("총 상금 및 당첨자 1인당 리워드", null),
  bullet("캠페인 기간 (시작일 및 종료일)", null),
  bullet("미션 목록 -- 완료해야 할 모든 과제", null),
  bullet("실시간 참여자 목록 (전체 미션 완료 유저)", null),
  bullet("당첨자 목록 (추첨 완료 후 공개)", null),
  sp(1),
  note("미션을 제출하려면 로그인이 필요합니다. 로그인하지 않은 상태에서는 로그인 페이지로 이동합니다."),
  sp(1),

  // 3.2
  h2("3.2  미션 수행"),
  body("각 캠페인에는 하나 이상의 미션이 있습니다. 추첨 대상이 되려면 캠페인의 모든 미션을 완료해야 합니다."),
  sp(1),
  warn("각 미션은 한 번만 제출할 수 있습니다. [완료 및 제출] 버튼을 클릭하기 전에 답변이 올바른지 확인하세요."),
  sp(1),

  h3("미션 상태 안내"),
  twoColTable(
    ["상태", "의미"],
    [
      ["미시작",    "아직 이 미션을 시도하지 않았습니다."],
      ["검토 중",   "제출한 답변이 매니저의 검토를 기다리고 있습니다."],
      ["승인됨",    "제출한 답변이 승인되었습니다. 미션 완료!"],
      ["반려됨",    "제출한 답변이 반려되었습니다. 사유를 확인하고 가능하다면 다시 제출하세요."],
    ], 2800
  ),
  sp(1),

  h3("미션 종류별 안내"),
  body("pickku는 5가지 카테고리, 총 13가지 미션 유형을 지원합니다. 각 유형의 안내를 꼼꼼히 읽어보세요."),
  sp(1),

  infoBox(["  일반 미션"], "DBEAFE", BLUE),
  sp(1),
  missionTable([
    ["[링크]",   "링크 방문",      "['링크 열기'] 버튼을 클릭하여 지정된 URL을 방문하세요. 최소 체류 시간 동안 페이지에 머물러야 합니다.", "서버가 기록된 체류 시간이 최소 요건을 충족하는지 확인합니다."],
    ["[코드]",   "코드 입력",      "기업이 제공한 정확한 코드(예: 이벤트 코드, 프로모 코드)를 입력하세요.", "서버가 입력값과 정답 코드를 비교합니다. (대소문자 구분 없음)"],
    ["[퀴즈]",   "퀴즈",           "질문을 읽고 객관식 보기 중 정답을 선택하세요.", "서버가 선택한 보기가 정답인지 확인합니다."],
    ["[설문]",   "설문 조사",      "설문의 모든 질문에 답하세요. 질문은 단답형 또는 객관식일 수 있습니다.", "서버가 모든 질문에 응답했는지 확인합니다."],
    ["[체크]",   "체크인",         "미션 설명을 읽고 확인 체크박스('확인했습니다')를 클릭하세요.", "체크박스를 선택하면 자동으로 승인됩니다."],
    ["[파일]",   "파일 업로드",    "업로드한 파일의 URL을 붙여넣으세요. (예: Google Drive, Dropbox 링크)", "서버가 URL 필드가 비어있지 않은지 확인합니다."],
  ]),
  sp(1),

  infoBox(["  유튜브 미션  --  YouTube 계정 연동 필요"], PALE, MINT),
  sp(1),
  note("유튜브 미션을 수행하려면 마이페이지 > SNS 계정 연동에서 YouTube(Google) 계정을 먼저 연동해야 합니다. 자세한 내용은 3.3절을 참고하세요."),
  sp(1),
  missionTable([
    ["[시청]",    "유튜브 동영상 시청",  "['동영상 열기'] 버튼을 클릭해 지정된 유튜브 동영상을 시청하세요. 진행 바가 요구 시간에 도달할 때까지 시청하세요.", "서버가 YouTube API를 통해 요구 시간 이상 시청했는지 검증합니다."],
    ["[구독]",    "유튜브 구독",         "['구독하기'] 버튼을 클릭해 채널 페이지로 이동 후 구독하세요. 돌아와서 ['확인'] 버튼을 클릭하세요.", "서버가 YouTube API를 호출하여 채널 구독 여부를 확인합니다."],
    ["[좋아요]",  "유튜브 좋아요",       "['좋아요'] 버튼을 클릭해 영상으로 이동 후 좋아요를 누르세요. 돌아와서 ['확인'] 버튼을 클릭하세요.", "서버가 YouTube API를 호출하여 좋아요 여부를 확인합니다."],
  ]),
  sp(1),

  infoBox(["  텔레그램 미션  --  Telegram 계정 연동 필요"], PALE, SKY),
  sp(1),
  note("텔레그램 미션을 수행하려면 마이페이지 > SNS 계정 연동에서 Telegram 계정을 먼저 연동해야 합니다. 자세한 내용은 3.3절을 참고하세요."),
  sp(1),
  missionTable([
    ["[채널]", "텔레그램 채널 참여", "['채널 참여'] 버튼을 클릭해 Telegram 채널 링크를 여세요. Telegram 앱에서 채널에 참여하세요.", "Telegram Bot API가 계정이 해당 채널에 가입했는지 확인합니다."],
    ["[그룹]", "텔레그램 그룹 참여", "['그룹 참여'] 버튼을 클릭해 Telegram 그룹 링크를 여세요. Telegram 앱에서 그룹에 참여하세요.", "Telegram Bot API가 계정이 해당 그룹의 멤버인지 확인합니다."],
  ]),
  sp(1),

  infoBox(["  디스코드 미션  --  Discord 계정 연동 필요"], PALE, "5865F2"),
  sp(1),
  note("디스코드 미션을 수행하려면 마이페이지 > SNS 계정 연동에서 Discord 계정을 먼저 연동해야 합니다. 자세한 내용은 3.3절을 참고하세요."),
  sp(1),
  missionTable([
    ["[디스코드]", "디스코드 서버 참여", "['서버 참여'] 버튼을 클릭해 Discord 초대 링크를 여세요. Discord 앱 또는 브라우저에서 초대를 수락하세요.", "Discord Bot API가 계정이 해당 서버의 멤버인지 확인합니다."],
  ]),
  sp(1),

  infoBox(["  인스타그램 미션  --  수동 검증"], PALE, AMBER),
  sp(1),
  warn("인스타그램 미션은 캠페인 매니저가 직접 확인합니다. 자동 API 검증이 없습니다."),
  sp(1),
  missionTable([
    ["[팔로우]", "인스타그램 팔로우", "['팔로우'] 버튼을 클릭해 Instagram 프로필로 이동 후 팔로우하세요.", "캠페인 매니저가 제출 내역을 직접 검토하고 승인합니다."],
    ["[좋아요]", "인스타그램 좋아요", "['좋아요'] 버튼을 클릭해 Instagram 게시물로 이동 후 좋아요를 누르세요.", "캠페인 매니저가 제출 내역을 직접 검토하고 승인합니다."],
  ]),
  sp(1),

  h3("미션 제출 단계별 안내"),
  body("미션을 완료하고 제출하는 일반적인 과정은 다음과 같습니다:"),
  sp(1),
  ...[
    ["캠페인 상세 페이지 열기", "해당 캠페인으로 이동 후 미션 목록으로 스크롤합니다."],
    ["미션 안내 읽기", "각 미션 카드에서 유형, 제목, 설명을 확인합니다."],
    ["요구 행동 수행", "유형에 따라 링크 방문, 질문 답변, 그룹 참여 등의 행동을 수행합니다."],
    ["답변 입력 (필요 시)", "코드, 퀴즈, 설문, 파일 업로드 미션은 입력 필드에 답변을 입력합니다."],
    ["[완료 및 제출] 클릭", "버튼을 클릭하여 제출 내역을 서버로 전송합니다."],
    ["검증 대기", "서버가 제출 내역을 확인하는 동안 '검증 중...' 상태가 표시됩니다."],
    ["결과 확인", "승인되면 미션 카드에 '승인됨'이 표시됩니다. 반려된 경우 사유가 표시됩니다."],
  ].map(([step, desc], i) =>
    new Paragraph({
      spacing: { before: 50, after: 60 },
      indent: { left: 480, hanging: 480 },
      children: [
        new TextRun({ text: `${i + 1}.  `, font: "맑은 고딕", size: 22, bold: true, color: BLUE }),
        new TextRun({ text: step + " -- ", font: "맑은 고딕", size: 22, bold: true, color: NAVY }),
        new TextRun({ text: desc, font: "맑은 고딕", size: 22, color: G1 }),
      ]
    })
  ),
  sp(1),

  // 3.3
  h2("3.3  SNS 계정 연동"),
  body("YouTube, Telegram, Discord 미션을 수행하려면 먼저 해당 소셜 계정을 연동해야 합니다. 마이페이지 > SNS 계정 연동 섹션에서 진행할 수 있습니다."),
  sp(1),

  h3("텔레그램 연동"),
  stepBox(1, "연동 시작", [
    "상단 내비게이션 바에서 마이페이지로 이동합니다.",
    "SNS 계정 연동 섹션으로 스크롤합니다.",
    "Telegram 옆 [연동] 버튼을 클릭합니다.",
  ]),
  sp(1),
  stepBox(2, "텔레그램 봇으로 인증", [
    "새 창에서 pickku Telegram 봇이 열립니다.",
    "Telegram에서 [시작] 버튼을 클릭하여 인증을 시작합니다.",
    "봇이 Telegram 계정을 등록합니다.",
  ]),
  sp(1),
  stepBox(3, "연동 확인", [
    "페이지가 자동으로 연동을 감지합니다. (2분 동안 3초마다 확인)",
    "마이페이지 Telegram 섹션에 내 핸들이 표시됩니다.",
    "이제 Telegram 미션을 수행할 수 있습니다.",
  ]),
  sp(1),
  note("마이페이지에 핸들이 나타날 때까지 Telegram 봇 창을 열어두세요."),
  sp(1),

  h3("디스코드 연동"),
  stepBox(1, "연동 시작", [
    "마이페이지 > SNS 계정 연동으로 이동합니다.",
    "Discord 옆 [연동] 버튼을 클릭합니다.",
    "Discord OAuth 인증 페이지로 이동합니다.",
  ]),
  sp(1),
  stepBox(2, "Discord에서 인증", [
    "Discord에 로그인되어 있지 않다면 로그인합니다.",
    "[승인] 버튼을 클릭하여 pickku가 계정 정보를 읽을 수 있도록 허용합니다.",
  ]),
  sp(1),
  stepBox(3, "pickku로 복귀", [
    "자동으로 마이페이지로 리다이렉트됩니다.",
    "Discord 섹션에 내 핸들이 표시됩니다.",
    "이제 Discord 미션을 수행할 수 있습니다.",
  ]),
  sp(1),

  h3("유튜브(Google 계정) 연동"),
  stepBox(1, "연동 시작", [
    "마이페이지 > SNS 계정 연동으로 이동합니다.",
    "YouTube 옆 [연동] 버튼을 클릭합니다.",
    "Google OAuth 동의 화면으로 이동합니다.",
  ]),
  sp(1),
  stepBox(2, "Google 계정 선택", [
    "사용할 YouTube 채널이 있는 Google 계정을 선택합니다.",
    "pickku가 구독 정보 및 활동 데이터를 읽을 수 있도록 권한을 허용합니다.",
  ]),
  sp(1),
  stepBox(3, "연동 확인", [
    "자동으로 마이페이지로 리다이렉트됩니다.",
    "YouTube 섹션에 내 핸들이 표시됩니다.",
    "이제 YouTube 구독, 좋아요, 시청 미션을 수행할 수 있습니다.",
  ]),
  sp(1),
  warn("반드시 올바른 Google 계정을 선택하세요. YouTube 활동(구독, 좋아요)은 이 계정을 기준으로 검증됩니다."),
  sp(1),

  h3("SNS 계정 연동 해제"),
  body("연동을 해제하려면 마이페이지에서 해당 계정 옆 [연동 해제] 버튼을 클릭하세요. 확인 후 계정이 제거됩니다."),
  sp(1),

  // 3.4
  h2("3.4  마이페이지 -- 프로필 & 활동 내역"),
  body("상단 내비게이션 바에서 마이페이지를 클릭하여 프로필 관리 및 활동 내역을 확인하세요."),
  sp(1),

  h3("프로필 탭"),
  twoColTable(
    ["설정 항목", "설명"],
    [
      ["닉네임",          "표시 이름을 변경합니다."],
      ["지갑 주소",       "리워드 수령용 블록체인 지갑 주소를 변경합니다."],
      ["생년월일",        "생년월일을 변경합니다."],
      ["성별",            "성별을 변경합니다."],
      ["국가",            "국가를 변경합니다."],
      ["프로필 사진",     "프로필 사진을 업로드합니다. (JPEG/PNG/GIF/WebP, 최대 2MB)"],
      ["SNS 계정 연동",   "Telegram, Discord, YouTube 계정을 연동하거나 해제합니다."],
    ], 3200
  ),
  sp(1),

  h3("활동 탭"),
  body("활동 탭에서는 캠페인 참여 내역을 세 개의 서브탭으로 확인할 수 있습니다:"),
  twoColTable(
    ["서브탭", "표시 내용"],
    [
      ["활성 중",  "현재 참여 중인 캠페인 (미션을 1개 이상 제출한 경우)"],
      ["당첨됨",   "추첨에서 당첨된 캠페인, 순위 및 리워드 정보"],
      ["종료됨",   "종료된 캠페인 (당첨 여부 무관)"],
    ], 2600
  ),
  sp(1),

  h3("계정 삭제"),
  warn("계정 삭제는 영구적으로 취소할 수 없습니다. 모든 미션, 포인트, 활동 내역이 삭제됩니다."),
  body("프로필 탭 하단의 [계정 삭제] 버튼을 클릭하면 계정을 삭제할 수 있습니다. 최종 확인 후 삭제됩니다."),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// 4장 -- 기업 가이드
// ════════════════════════════════════════════════════════════════
P(
  sectionBadge("4장  --  기업(캠페인 매니저) 가이드", BLUE),
  sp(1),
  h1("4. 기업(캠페인 매니저) 가이드"),
  body("이 장에서는 캠페인 생성, 미션 설정, 제출 관리, 당첨자 추첨 방법을 설명합니다."),
  sp(1),

  // 4.1
  h2("4.1  매니저 권한 신청"),
  body("신규 계정은 기본적으로 '유저' 권한입니다. 캠페인을 생성하려면 플랫폼 관리자에게 연락하여 매니저 권한을 요청하세요."),
  sp(1),
  infoBox([
    "관리자 연락처: [관리자 이메일 또는 문의 폼 URL을 입력하세요]",
    "권한이 부여되면 내비게이션 바에 [Ops] 메뉴가 표시됩니다.",
  ], PALE, BLUE),
  sp(1),

  // 4.2
  h2("4.2  캠페인 만들기 (단계별 안내)"),
  body("내비게이션 바에서 [Ops]를 클릭한 뒤 [새 캠페인]을 클릭하세요. 캠페인 생성은 3단계로 진행됩니다."),
  sp(1),

  stepBox(1, "기업 및 캠페인 기본 정보", [
    "기업명 -- 조직명을 입력합니다. (캠페인 카드에 표시됩니다)",
    "기업 로고 -- 로고를 업로드합니다. (JPEG/PNG/GIF/WebP/SVG, 최대 2MB)",
    "캠페인 제목 -- 명확하고 설명적인 제목을 입력합니다. (필수)",
    "설명 -- 리치 텍스트 에디터로 캠페인 상세 설명을 작성합니다. 서식, 링크, 이미지를 삽입할 수 있습니다.",
  ]),
  sp(1),

  stepBox(2, "운영 방식 및 리워드 설정", [
    "당첨자 수 -- 상을 받을 유저 수를 입력합니다. (최소 1명)",
    "추첨 방식 -- 당첨자 선정 방법을 선택합니다. (아래 추첨 방식 참고)",
    "자동 승인 -- 체크 시 유효한 제출을 자동 승인합니다. 미체크 시 매니저가 직접 검토해야 합니다.",
    "시작일 / 종료일 -- 선택 사항입니다. 설정 시 자동 활성화 및 자동 종료됩니다.",
    "리워드 -- 리워드 항목을 추가합니다. 각 항목에 금액(Amount)과 통화(POINT / USDT / BRL / METAQ)를 설정합니다.",
  ]),
  sp(1),
  h3("추첨 방식"),
  twoColTable(
    ["방식", "당첨자 선정 방법"],
    [
      ["단순 추첨 (동등 확률)", "모든 미션을 완료한 유저가 동등한 확률로 추첨됩니다. 전체 자격자 중 무작위로 선정합니다."],
      ["가중 추첨 (미션 수 비례)", "유저가 완료한 미션 1개당 추첨 티켓 1장이 부여됩니다. 미션을 많이 완료할수록 당첨 확률이 높아집니다. 미션이 여러 개일 때만 적용됩니다."],
    ], 3400
  ),
  sp(1),

  stepBox(3, "미션 설정", [
    "[+ 미션 추가] 버튼을 클릭하여 미션을 추가합니다.",
    "분류된 그리드에서 미션 유형을 선택합니다. (각 유형 상세는 4.3절 참고)",
    "선택한 미션 유형에 맞는 필수 항목을 입력합니다.",
    "필요한 만큼 미션을 추가하고, 드래그로 순서를 조정할 수 있습니다.",
    "저장하기 전에 최소 1개의 미션이 필요합니다.",
  ]),
  sp(1),
  note("캠페인은 3단계 중 언제든지 저장할 수 있습니다. 매니저가 저장하면 '초안(Draft)' 상태로 저장되며, 공개하려면 관리자 승인이 필요합니다. 관리자가 직접 생성하면 즉시 '활성(Active)' 상태가 됩니다."),
  sp(1),

  h3("캠페인 상태 흐름"),
  twoColTable(
    ["상태", "설명"],
    [
      ["초안 (Draft)",          "저장되었지만 아직 검토 요청을 하지 않은 상태. 본인만 확인 가능합니다."],
      ["검토 중 (Pending Admin)", "관리자 검토를 요청한 상태. 관리자와 본인만 확인 가능합니다."],
      ["활성 (Active)",         "승인되어 공개된 상태. 유저가 참여하고 미션을 완료할 수 있습니다."],
      ["종료 (Closed)",         "수동으로 종료한 상태. 더 이상 제출할 수 없습니다."],
      ["추첨 완료 (Drawn)",     "추첨이 완료된 상태. 당첨자가 선정되고 리워드가 지급되었습니다."],
    ], 3000
  ),
  sp(1),

  // 4.3
  h2("4.3  미션 설정 가이드"),
  body("이 절에서는 13가지 미션 유형별 상세 설정 방법을 안내합니다."),
  sp(1),

  h3("일반 미션"),
  sp(1),

  infoBox(["링크 방문"], "E0F2FE", SKY),
  body("유저가 특정 URL을 방문하고 최소 체류 시간 동안 머물도록 하는 미션입니다."),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",           "미션 카드에 표시될 제목입니다. (예: '우리 제품 페이지 방문하기')"],
      ["URL",                 "유저가 방문해야 할 전체 URL입니다. (예: https://www.yourwebsite.com)"],
      ["최소 체류 시간 (초)", "유저가 페이지에 머물러야 하는 최소 시간(초)입니다. (예: 30 = 30초)"],
    ], 3400),
  sp(1),

  infoBox(["코드 입력"], "FEF9C3", AMBER),
  body("유저가 특정 코드(이벤트 코드, 프로모 코드 등)를 입력하도록 하는 미션입니다."),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",  "미션 카드에 표시될 제목입니다. (예: '이벤트 코드 입력')"],
      ["정답 코드",  "유저가 입력해야 할 정확한 코드입니다. 대소문자 구분 없이 검증됩니다. (예: LAUNCH2026)"],
    ], 3400),
  sp(1),

  infoBox(["퀴즈"], "F0FFF4", MINT),
  body("객관식 질문을 제시하고 정답을 맞추도록 하는 미션입니다."),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",  "미션 카드에 표시될 제목입니다."],
      ["퀴즈 질문",  "유저에게 제시할 질문입니다. (예: '우리 제품의 출시 연도는?')"],
      ["선택지",     "2개 이상의 보기를 추가합니다. [+ 보기 추가] 버튼으로 추가합니다."],
      ["정답",       "올바른 보기 옆 라디오 버튼을 선택합니다."],
    ], 3400),
  sp(1),

  infoBox(["설문 조사"], "FDF4FF", "9333EA"),
  body("유저에게 구조화된 질문지를 제시하는 미션입니다."),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",            "미션 카드에 표시될 제목입니다."],
      ["공통 안내문 (선택)", "설문 상단에 표시될 안내문입니다. (예: '솔직하게 답변해 주세요')"],
      ["설문 링크 (선택)",   "답변 전 방문할 외부 링크입니다. (예: 제품 소개 페이지)"],
      ["질문 목록",            "필요한 만큼 질문을 추가합니다. 각 질문에 유형과 내용을 입력합니다."],
    ], 3400),
  sp(1),
  body("질문 유형:"),
  twoColTable(["질문 유형", "설명"],
    [
      ["단답형", "유저가 자유롭게 텍스트를 입력합니다."],
      ["단일 선택", "유저가 보기 중 하나를 선택합니다. [+ 보기 추가]로 보기를 추가합니다."],
    ], 3200),
  sp(1),

  infoBox(["체크인"], "F0FFF4", MINT),
  body("유저가 내용을 읽고 확인 체크박스를 클릭하는 간단한 확인 미션입니다."),
  twoColTable(["항목", "설명"],
    [["미션 제목", "미션 카드에 표시될 제목입니다. (예: '이용 약관을 읽었습니다')"]],
    3400),
  note("체크인 미션은 항상 자동으로 승인됩니다."),
  sp(1),

  infoBox(["파일 업로드"], "FFF7ED", ORANGE),
  body("유저가 업로드한 파일의 URL을 제출하도록 하는 미션입니다."),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",    "미션 카드에 표시될 제목입니다. (예: '영수증 업로드')"],
      ["업로드 안내",  "어떤 파일을 어디에 업로드해야 하는지 유저에게 안내합니다. (예: 'Google Drive에 스크린샷을 업로드하고 링크를 붙여넣으세요')"],
    ], 3400),
  note("유저는 Google Drive, Dropbox 등의 파일 URL을 붙여넣습니다. 자동 승인이 꺼져 있으면 직접 파일을 확인해야 합니다."),
  sp(1),

  h3("유튜브 미션"),
  body("유튜브 미션은 유저의 Google 계정 연동이 필요합니다."),
  sp(1),

  infoBox(["유튜브 동영상 시청"], "FEF2F2", RED),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",          "미션 카드에 표시될 제목입니다."],
      ["YouTube 동영상 ID",  "YouTube URL에서 11자리 영상 ID입니다. (예: youtube.com/watch?v=dQw4w9WgXcQ 에서 dQw4w9WgXcQ)"],
      ["최소 시청 시간 (초)", "유저가 시청해야 할 최소 시간(초)입니다. (예: 60 = 1분)"],
    ], 3400),
  sp(1),

  infoBox(["유튜브 구독"], "FEF2F2", RED),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",    "미션 카드에 표시될 제목입니다."],
      ["채널 URL",     "YouTube 채널 전체 URL입니다. (예: https://www.youtube.com/@yourchannel)"],
      ["채널 ID",      "UC로 시작하는 YouTube 채널 ID입니다. YouTube 스튜디오 > 설정 > 채널 > 고급 설정에서 확인 가능합니다."],
    ], 3400),
  sp(1),

  infoBox(["유튜브 좋아요"], "FEF2F2", RED),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",  "미션 카드에 표시될 제목입니다."],
      ["동영상 URL", "좋아요를 눌러야 할 YouTube 동영상 전체 URL입니다."],
      ["동영상 ID",  "11자리 동영상 ID (YouTube Watch와 동일한 방법으로 확인)"],
    ], 3400),
  sp(1),

  h3("텔레그램 미션"),
  body("텔레그램 미션은 유저의 Telegram 계정 연동이 필요합니다. Telegram Bot이 자동으로 멤버십을 검증합니다."),
  sp(1),

  infoBox(["텔레그램 채널 / 텔레그램 그룹"], "E0F2FE", SKY),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",   "미션 카드에 표시될 제목입니다."],
      ["Telegram URL", "Telegram 채널 또는 그룹의 공개 초대 링크입니다. (예: https://t.me/yourchannel)"],
    ], 3400),
  note("비공개 채널/그룹은 초대 링크 형식을 사용하세요: https://t.me/+xxxxxx"),
  sp(1),

  h3("디스코드 미션"),
  body("디스코드 미션은 유저의 Discord 계정 연동이 필요합니다. Discord Bot이 서버 멤버십을 검증합니다."),
  sp(1),

  infoBox(["디스코드 서버 참여"], "EEF2FF", "5865F2"),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",         "미션 카드에 표시될 제목입니다."],
      ["Discord 초대 URL",  "Discord 서버 초대 링크입니다. (예: https://discord.gg/xxxxxxx) 만료되지 않는 링크를 사용하세요."],
    ], 3400),
  warn("Discord 초대 링크는 기본적으로 만료됩니다. 서버 설정에서 영구(만료 없음) 초대 링크를 생성하여 사용하세요."),
  sp(1),

  h3("인스타그램 미션"),
  body("인스타그램 미션은 자동 API 검증 없이 매니저가 직접 확인합니다."),
  sp(1),

  infoBox(["인스타그램 팔로우 / 인스타그램 좋아요"], "FDF4FF", "E1306C"),
  twoColTable(["항목", "설명"],
    [
      ["미션 제목",         "미션 카드에 표시될 제목입니다."],
      ["Instagram 핸들",    "(팔로우) @ 없이 Instagram 사용자명을 입력합니다. (예: yourbrand)"],
      ["게시물 ID",         "(좋아요) Instagram 게시물 ID를 입력합니다. 게시물 URL에서 확인 가능: instagram.com/p/[게시물 ID]/"],
    ], 3400),
  note("인스타그램 미션은 수동 검증이므로 자동 승인(Auto Approve)을 반드시 OFF로 설정하세요."),
  sp(1),

  // 4.4
  h2("4.4  캠페인 관리"),
  body("캠페인 생성 후 내비게이션 바의 [Ops]에서 캠페인을 선택하면 관리 인터페이스로 이동합니다. 네 개의 탭이 있습니다:"),
  sp(1),
  twoColTable(
    ["탭", "기능"],
    [
      ["구성 (Compose)",      "캠페인 정보, 운영 방식, 미션을 편집합니다. 미션 편집은 초안 또는 검토 중 상태일 때만 가능합니다."],
      ["통계 (Statistics)",   "미션별 제출 현황(승인/검토 중/반려) 및 참여자 활동 요약을 확인합니다."],
      ["참여자 (Participants)", "모든 참여자 목록, 이메일, 지갑 주소, SNS 핸들, 완료한 미션 수, 전체 상태를 확인합니다."],
      ["당첨자 (Winners)",    "추첨 완료 후 당첨자 목록을 확인합니다."],
    ], 3000
  ),
  sp(1),
  note("참여자 탭에서 [데이터 내보내기(Excel)] 버튼을 클릭하면 참여자 데이터를 엑셀 파일로 내보낼 수 있습니다."),
  sp(1),

  // 4.5
  h2("4.5  제출 검토 및 추첨 실행"),
  sp(1),

  h3("제출 검토 (수동 승인 모드)"),
  body("자동 승인이 꺼져 있는 경우, 미션 제출 내역을 직접 검토해야 합니다."),
  body("구성(Compose) 탭에서 미션 제출 섹션으로 스크롤하세요. 각 제출에 대해 다음 정보를 확인할 수 있습니다:"),
  bullet("제출자 이메일 주소", null),
  bullet("제출한 내용 (답변, 코드, 파일 URL, 체류 시간 등)", null),
  bullet("제출 시간", null),
  sp(1),
  body("[승인] 버튼을 클릭하여 수락하거나 [반려] 버튼을 클릭하여 거절하세요. 반려된 유저는 캠페인이 활성 상태인 경우 다시 제출할 수 있습니다."),
  sp(1),
  note("퀴즈 미션의 경우 정답/오답 여부가 표시됩니다. 설문 미션의 경우 전체 응답 내용이 표시됩니다."),
  sp(1),

  h3("추첨 실행"),
  warn("추첨은 최종적이며 취소할 수 없습니다. 추첨 전에 모든 제출 내역을 검토 완료한 후 진행하세요."),
  sp(1),
  body("추첨 방법은 두 가지입니다:"),
  sp(1),
  twoColTable(
    ["방법", "동작 방식"],
    [
      ["자동 추첨", "캠페인에 종료일이 설정된 경우, 종료 후 1분 이내에 플랫폼이 자동으로 추첨을 실행합니다. 별도 조치가 필요 없습니다."],
      ["수동 추첨", "캠페인 관리 페이지에서 [추첨 실행] 버튼을 클릭합니다. 캠페인이 활성 상태일 때 언제든지 실행 가능합니다."],
    ], 3200
  ),
  sp(1),
  body("추첨 완료 후:"),
  bullet("당첨자 탭에서 순위 및 리워드 금액과 함께 당첨자 목록이 공개됩니다.", null),
  bullet("POINT 리워드는 당첨자 포인트 잔액에 자동으로 추가됩니다.", null),
  bullet("암호화폐 리워드(USDT, BRL, METAQ)는 당첨자 목록에 표시된 지갑 주소로 직접 전송해야 합니다.", null),
  bullet("캠페인 상태가 '추첨 완료(Drawn)'로 변경됩니다.", null),
  sp(1),

  // 4.6
  h2("4.6  참여자 데이터 내보내기"),
  body("참여자 데이터를 엑셀 파일로 내보내 자체 분석에 활용할 수 있습니다."),
  sp(1),
  body("캠페인 관리 페이지 > [참여자] 탭 > [데이터 내보내기(Excel)] 버튼을 클릭하세요."),
  sp(1),
  body("내보내기 파일에 포함된 정보:"),
  bullet("유저 이메일 주소", null),
  bullet("지갑 주소", null),
  bullet("SNS 핸들 (Telegram, Discord, YouTube, Instagram)", null),
  bullet("성별, 연령대, 국가, 지역", null),
  bullet("완료한 미션 수", null),
  bullet("미션별 제출 상태", null),
  bullet("설문 응답 및 기타 제출 내용", null),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// 5장 -- 포인트 & 리워드
// ════════════════════════════════════════════════════════════════
P(
  h1("5. 포인트 & 리워드"),
  sp(1),

  h2("5.1  포인트 적립 방법"),
  body("포인트는 플랫폼의 주요 내부 통화입니다. POINT 리워드가 있는 캠페인에서 당첨되면 포인트가 자동으로 잔액에 추가됩니다."),
  body("현재 포인트 잔액은 마이페이지에서 확인할 수 있으며, 여러 캠페인에 걸쳐 누적됩니다."),
  warn("포인트는 지급일로부터 1년 후 만료됩니다. 만료 전에 사용하거나 교환하세요."),
  sp(1),

  h2("5.2  암호화폐 리워드 수령 방법"),
  body("USDT, BRL, METAQ 리워드는 프로필에 등록한 지갑 주소로 기업이 직접 전송합니다."),
  sp(1),
  infoBox([
    "중요: 암호화폐 리워드 캠페인 참여 전에 지갑 주소가 올바른지 반드시 확인하세요.",
    "잘못 입력된 지갑 주소로 전송된 리워드는 복구할 수 없습니다.",
    "추첨 실행 전까지 마이페이지 > 프로필에서 지갑 주소를 언제든지 변경할 수 있습니다.",
  ], "FFF7ED", AMBER),
  sp(1),

  h2("5.3  추첨 공정성"),
  body("모든 추첨은 서버 측 알고리즘으로 실행되며 다음을 보장합니다:"),
  bullet("단순 추첨 방식: 자격을 갖춘 모든 유저가 수학적으로 동등한 확률을 가집니다.", null),
  bullet("가중 추첨 방식: 완료한 미션 1개당 추첨 티켓 1장이 부여되며, 당첨 확률은 보유 티켓 수에 비례합니다.", null),
  bullet("추첨 과정은 로그로 기록되며 결과는 최종적입니다.", null),
  sp(1),

  h2("5.4  당첨 내역 확인"),
  body("마이페이지 > 활동 탭 > [당첨됨]에서 당첨된 캠페인, 순위, 리워드 금액을 확인할 수 있습니다."),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// 6장 -- FAQ
// ════════════════════════════════════════════════════════════════
P(
  h1("6. 자주 묻는 질문 (FAQ)"),
  sp(1),

  ...[
    ["미션을 완료했는데 상태가 여전히 '검토 중'입니다. 어떻게 하나요?",
     "캠페인의 자동 승인이 꺼져 있는 경우 매니저가 직접 제출 내역을 검토해야 합니다. 매니저의 검토를 기다려주세요. 캠페인이 종료된 후에도 '검토 중' 상태라면 캠페인 매니저에게 문의하세요."],
    ["미션을 제출한 후 답변을 변경할 수 있나요?",
     "아니요. 각 미션은 한 번만 제출할 수 있습니다. [완료 및 제출] 버튼을 클릭하기 전에 답변이 올바른지 확인하세요."],
    ["YouTube/Discord/Telegram 미션에서 ['확인'] 버튼을 눌렀는데 검증에 실패했습니다. 어떻게 하나요?",
     "['확인']을 클릭하기 전에 구독, 참여 등 요구 행동을 실제로 완료했는지 확인하세요. 마이페이지에서 올바른 SNS 계정이 연동되어 있는지도 확인하세요. 문제가 지속되면 연동을 해제하고 다시 연동한 후 재시도해 보세요."],
    ["지갑 주소를 잘못 입력했습니다. 변경할 수 있나요?",
     "네. 마이페이지 > 프로필로 이동하여 지갑 주소를 변경하세요. 추첨 실행 전에 새 주소를 저장해야 합니다. 당첨된 이후에는 지갑 주소를 변경할 수 없습니다."],
    ["당첨 여부를 어떻게 확인하나요?",
     "추첨이 완료되면 캠페인 상세 페이지에 당첨자 목록이 표시됩니다. 마이페이지 > 활동 > [당첨됨] 탭에서도 확인할 수 있습니다."],
    ["기업으로서 캠페인이 활성화된 후에도 편집할 수 있나요?",
     "캠페인의 기본 정보(제목, 설명, 기업명, 로고, 추첨 설정 등)는 언제든지 편집 가능합니다. 단, 캠페인 상태가 '활성(Active)'이 된 후에는 미션을 추가하거나 수정할 수 없습니다."],
    ["관리자가 캠페인을 승인하는 데 얼마나 걸리나요?",
     "승인 시간은 관리자 스케줄에 따라 다릅니다. 일반적으로 1~2 영업일 이내입니다. 캠페인 상태가 '검토 중(Pending Admin)'에서 '활성(Active)'으로 변경되면 승인된 것입니다."],
    ["모든 미션을 완료한 유저가 없으면 어떻게 되나요?",
     "모든 미션을 완료한 유저가 없으면 추첨 대상자가 없어 당첨자가 나오지 않습니다. 캠페인은 당첨자 0명으로 종료됩니다."],
    ["활성 상태의 캠페인을 삭제할 수 있나요?",
     "활성 상태의 캠페인은 삭제할 수 없습니다. 캠페인 관리 페이지에서 상태를 '종료(Closed)'로 변경하여 조기 종료할 수 있습니다."],
    ["pickku는 어떤 언어를 지원하나요?",
     "pickku는 현재 영어, 한국어, 포르투갈어(Portugues)를 지원합니다. 상단 내비게이션 바의 언어 변환 버튼을 사용하여 언어를 변경할 수 있습니다."],
  ].flatMap(([q, a]) => [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: "Q   ", font: "맑은 고딕", size: 23, bold: true, color: BLUE }),
        new TextRun({ text: q, font: "맑은 고딕", size: 23, bold: true, color: NAVY }),
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 120 },
      indent: { left: 340 },
      children: [
        new TextRun({ text: "A  ", font: "맑은 고딕", size: 22, bold: true, color: MINT }),
        new TextRun({ text: a, font: "맑은 고딕", size: 22, color: G1 }),
      ]
    }),
    divider(G4)
  ]),
  sp(2),

  // 마무리
  new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT, type: WidthType.DXA },
      borders: bsNone(),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 280, bottom: 280, left: 400, right: 400 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "pickku", font: "맑은 고딕", size: 60, bold: true, color: WHITE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "미션을 완료하고 리워드를 받으세요.", font: "맑은 고딕", size: 26, color: SKY, italics: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "문의 사항은 플랫폼 관리자에게 연락하세요.", font: "맑은 고딕", size: 20, color: G3 })] }),
      ]
    })] })]
  })
);

// ════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "-", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
      { reference: "nums",   levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "맑은 고딕", size: 22, color: G1 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "맑은 고딕", color: NAVY },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "맑은 고딕", color: BLUE },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "맑은 고딕", color: NAVY },
        paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
      }
    },
    footers: { default: makeFooter() },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("C:\\Users\\Code7\\work\\Rewardplatform\\pickku_UserGuide_KO.docx", buf);
  console.log("pickku_UserGuide_KO.docx 생성 완료.");
}).catch(err => { console.error(err); process.exit(1); });
