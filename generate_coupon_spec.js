const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, LevelFormat, Header, Footer, PageNumber
} = require('docx');
const fs = require('fs');

// ── 색상 팔레트 ──────────────────────────────────────────────
const C = {
  PRIMARY:    '4F46E5',  // 인디고
  PRIMARY_L:  'EEF2FF',  // 연한 인디고
  GREEN:      '059669',  // 민트 그린
  GREEN_L:    'ECFDF5',
  AMBER:      'D97706',  // 황색
  AMBER_L:    'FFFBEB',
  DARK:       '1E1B4B',  // 다크 네이비
  GRAY:       '6B7280',
  GRAY_L:     'F9FAFB',
  BORDER:     'C7D2FE',  // 인디고 보더
  WHITE:      'FFFFFF',
};

const FONT = '맑은 고딕';
const PAGE_W = 11906;  // A4
const PAGE_H = 16838;
const MARGIN  = 1080;  // ~1.9cm
const CONTENT_W = PAGE_W - MARGIN * 2;  // 9746 DXA

// ── 유틸 ─────────────────────────────────────────────────────
function makeBorder(color = C.BORDER) {
  return { style: BorderStyle.SINGLE, size: 4, color };
}
function cellBorders(color = C.BORDER) {
  const b = makeBorder(color);
  return { top: b, bottom: b, left: b, right: b };
}
function noBorder() {
  const b = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: b, bottom: b, left: b, right: b };
}
function spacing(before = 0, after = 120) {
  return { before, after };
}

// ── 텍스트 런 헬퍼 ────────────────────────────────────────────
function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: opts.size || 20, ...opts });
}
function bold(text, opts = {}) {
  return run(text, { bold: true, ...opts });
}

// ── 단락 헬퍼 ────────────────────────────────────────────────
function para(children, opts = {}) {
  if (typeof children === 'string') children = [run(children)];
  return new Paragraph({ children, spacing: spacing(0, 120), ...opts });
}
function heading1(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: C.WHITE })],
    spacing: spacing(60, 60),
    shading: { fill: C.PRIMARY, type: ShadingType.CLEAR },
    indent: { left: 200, right: 200 },
  });
}
function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: C.PRIMARY })],
    spacing: spacing(280, 80),
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.PRIMARY } },
  });
}
function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: C.DARK })],
    spacing: spacing(200, 60),
  });
}
function bodyText(text, color = '000000') {
  return para([run(text, { color })]);
}
function gap(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [run('')], spacing: spacing(0, 0) }));
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── 불릿 단락 ────────────────────────────────────────────────
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: [run(text, { size: 20 })],
    spacing: spacing(0, 60),
  });
}
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    children: [run(text, { size: 20 })],
    spacing: spacing(0, 60),
  });
}

// ── 테이블 헬퍼 ──────────────────────────────────────────────
function headerCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders(C.PRIMARY),
    shading: { fill: C.PRIMARY, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [bold(text, { color: C.WHITE, size: opts.size || 18 })],
    })],
  });
}
function dataCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders(C.BORDER),
    shading: { fill: opts.fill || C.WHITE, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 150, right: 150 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [run(text, { size: 18, color: opts.color || '333333', bold: opts.bold })],
    })],
  });
}

// ── 강조 박스 ────────────────────────────────────────────────
function infoBox(lines, fill = C.PRIMARY_L, borderColor = C.PRIMARY) {
  const rows = lines.map(line =>
    new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: { top: makeBorder(borderColor), bottom: makeBorder(borderColor), left: { style: BorderStyle.SINGLE, size: 12, color: borderColor }, right: makeBorder(borderColor) },
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 180, right: 180 },
        children: [new Paragraph({
          children: [run(line, { size: 18, color: C.DARK })],
          spacing: spacing(0, 60),
        })],
      })],
    })
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows,
    margins: { top: 100, bottom: 100 },
  });
}

// ── 플로우 박스 (코드블록 스타일) ─────────────────────────────
function flowBox(lines) {
  const rows = lines.map(line =>
    new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: noBorder(),
        shading: { fill: '1E1B4B', type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 220, right: 220 },
        children: [new Paragraph({
          children: [run(line, { size: 17, color: 'A5B4FC', font: 'Consolas' })],
          spacing: spacing(0, 20),
        })],
      })],
    })
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows,
  });
}

// ────────────────────────────────────────────────────────────
//  본문 콘텐츠
// ────────────────────────────────────────────────────────────

// === 표지 ===
function makeCoverPage() {
  return [
    ...gap(6),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: spacing(0, 60),
      children: [new TextRun({ text: 'pickku', font: FONT, size: 72, bold: true, color: C.PRIMARY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: spacing(0, 80),
      children: [new TextRun({ text: '쿠폰 시스템 기획서', font: FONT, size: 52, bold: true, color: C.DARK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: spacing(0, 40),
      children: [run('Coupon System Specification', { size: 24, color: C.GRAY })],
    }),
    ...gap(2),
    new Table({
      width: { size: 5000, type: WidthType.DXA },
      columnWidths: [5000],
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 5000, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.SINGLE, size: 8, color: C.PRIMARY }, bottom: noBorder().top, left: noBorder().top, right: noBorder().top },
        shading: { fill: C.WHITE, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [] })],
      })]})],
    }),
    ...gap(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('2025', { size: 22, color: C.GRAY })],
    }),
    pageBreak(),
  ];
}

// === 1. 개요 ===
function makeSection1() {
  return [
    heading1('1.  개요'),
    ...gap(1),
    heading2('1-1.  목적'),
    bullet('유저의 플랫폼 재방문율 및 체류 시간 증가'),
    bullet('캠페인 운영자(B2B)에게 새로운 보상 수단 제공'),
    bullet('추첨 기반 게임 요소로 플랫폼 재미 요소 강화'),
    bullet('운영자 쿠폰 판매를 통한 플랫폼 수익 창출'),
    ...gap(1),
    heading2('1-2.  쿠폰 생태계 구조'),
    ...gap(1),
    flowBox([
      '  pickku 쿠폰 생태계',
      '',
      '  [방식 1: 이벤트 쿠폰]          [방식 2: 캠페인 보상 쿠폰]',
      '    출석체크 / 친구 초대             운영자 쿠폰 상점 구매',
      '                |                          |',
      '                +────── 유저 쿠폰 지갑 ─────+',
      '                               |',
      '                          추첨기 (잭팟)',
      '                               |',
      '                          랜덤 보상 지급',
    ]),
    ...gap(1),
    heading2('1-3.  핵심 개념 요약'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2200, 3800, 3746],
      rows: [
        new TableRow({ children: [headerCell('구성 요소', 2200), headerCell('설명', 3800), headerCell('관련 주체', 3746)] }),
        new TableRow({ children: [
          dataCell('이벤트 쿠폰', 2200, { fill: C.PRIMARY_L, bold: true }),
          dataCell('출석 / 친구 초대 시 플랫폼이 쿠폰 무료 지급', 3800),
          dataCell('유저', 3746, { center: true }),
        ]}),
        new TableRow({ children: [
          dataCell('캠페인 보상 쿠폰', 2200, { fill: C.GREEN_L, bold: true }),
          dataCell('캠페인 완료 보상으로 쿠폰 지급 (운영자 구매 필요)', 3800),
          dataCell('운영자 + 유저', 3746, { center: true }),
        ]}),
        new TableRow({ children: [
          dataCell('쿠폰 상점', 2200, { fill: C.AMBER_L, bold: true }),
          dataCell('운영자가 캠페인 보상용 쿠폰을 유료로 구매하는 공간', 3800),
          dataCell('운영자', 3746, { center: true }),
        ]}),
        new TableRow({ children: [
          dataCell('추첨기 (잭팟)', 2200, { bold: true }),
          dataCell('유저가 쿠폰을 소비하여 랜덤 보상을 받는 게임 요소', 3800),
          dataCell('유저', 3746, { center: true }),
        ]}),
      ],
    }),
    pageBreak(),
  ];
}

// === 2. 방식 1 - 이벤트 쿠폰 ===
function makeSection2() {
  return [
    heading1('2.  방식 1  —  이벤트 쿠폰'),
    ...gap(1),
    heading2('2-1.  쿠폰 지급 트리거'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 1400, 3400, 2546],
      rows: [
        new TableRow({ children: [headerCell('이벤트', 2400), headerCell('지급 수량', 1400), headerCell('조건', 3400), headerCell('중복 제한', 2546)] }),
        new TableRow({ children: [dataCell('출석체크', 2400), dataCell('1장', 1400, { center: true }), dataCell('하루 1회 버튼 클릭', 3400), dataCell('당일 1회', 2546, { center: true })] }),
        new TableRow({ children: [dataCell('연속 출석 7일', 2400, { fill: C.PRIMARY_L }), dataCell('+5장 보너스', 1400, { center: true, fill: C.PRIMARY_L, color: C.PRIMARY, bold: true }), dataCell('7일 연속 출석 완료 시 추가 지급', 3400, { fill: C.PRIMARY_L }), dataCell('주 1회', 2546, { center: true, fill: C.PRIMARY_L })] }),
        new TableRow({ children: [dataCell('친구 초대 (초대자)', 2400), dataCell('3장', 1400, { center: true }), dataCell('피초대자 회원가입 완료 시', 3400), dataCell('무제한', 2546, { center: true })] }),
        new TableRow({ children: [dataCell('친구 초대 (피초대자)', 2400, { fill: C.GREEN_L }), dataCell('2장', 1400, { center: true, fill: C.GREEN_L, color: C.GREEN, bold: true }), dataCell('초대 링크로 가입 완료 시', 3400, { fill: C.GREEN_L }), dataCell('최초 1회', 2546, { center: true, fill: C.GREEN_L })] }),
      ],
    }),
    ...gap(1),
    heading2('2-2.  출석체크 플로우'),
    ...gap(1),
    flowBox([
      '  유저 앱 접속',
      '      |',
      '      v',
      '  출석체크 버튼 클릭',
      '      |',
      '      +── 오늘 이미 체크 ──> "오늘 출석 완료" 표시  (종료)',
      '      |',
      '      +── 미체크',
      '              |',
      '              v',
      '          DB 기록 저장  (attendances 테이블)',
      '              |',
      '              v',
      '          연속 출석 일수 계산',
      '              |',
      '              +── 7일 연속? ──> 보너스 쿠폰 +5장 추가 지급',
      '              |',
      '              +── 일반 ──> 쿠폰 1장 지급',
      '                      |',
      '                      v',
      '                  CouponTransaction 기록 (type: ATTENDANCE)',
      '                      |',
      '                      v',
      '                  "쿠폰 1장 획득!" 팝업',
    ]),
    ...gap(1),
    heading2('2-3.  친구 초대 플로우'),
    ...gap(1),
    flowBox([
      '  [초대자] 마이페이지 → 친구 초대 탭',
      '      |',
      '      v',
      '  고유 초대 링크 생성: app.pickku.com/join?ref={userId}',
      '      |',
      '      v',
      '  링크 공유 (카카오톡 / URL 복사)',
      '',
      '  ── 피초대자 ──>  링크 클릭  ->  회원가입 페이지',
      '                       |',
      '                       v',
      '                   회원가입 완료',
      '                       |',
      '                       v',
      '                   유효성 검사',
      '                   (자기 초대 방지 / 중복 가입 방지)',
      '                       |',
      '                       v',
      '                   초대자: 쿠폰 +3장',
      '                   피초대자: 쿠폰 +2장',
      '                       |',
      '                       v',
      '                   양쪽 모두 알림 발송',
    ]),
    pageBreak(),
  ];
}

// === 3. 방식 2 - 캠페인 보상 쿠폰 ===
function makeSection3() {
  return [
    heading1('3.  방식 2  —  캠페인 보상 쿠폰'),
    ...gap(1),
    heading2('3-1.  전체 흐름'),
    ...gap(1),
    flowBox([
      '  캠페인 운영자',
      '      |',
      '      v',
      '  [쿠폰 상점] 패키지 선택  ->  결제',
      '      |  (100장 / 500장 / 1000장 / 5000장)',
      '      v',
      '  운영자 쿠폰 잔고 충전',
      '      |',
      '      v',
      '  [캠페인 생성] 보상 타입 → "쿠폰" 선택',
      '      |  완료 시 지급 수량 설정 (예: 3장)',
      '      |  최대 참여 인원 기반 필요 쿠폰 자동 계산',
      '      v',
      '  캠페인 게시  (필요 수량 escrow 예약)',
      '      |',
      '      v  (유저)',
      '  미션 완료 및 제출',
      '      |',
      '      v',
      '  운영자 잔고 차감  +  유저에게 쿠폰 지급',
      '      |',
      '      v',
      '  유저 쿠폰 지갑  ->  추첨기 사용 가능',
    ]),
    ...gap(1),
    heading2('3-2.  쿠폰 상점 패키지'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 2000, 2800, 2546],
      rows: [
        new TableRow({ children: [headerCell('패키지', 2400), headerCell('수량', 2000), headerCell('가격', 2800), headerCell('장당 단가', 2546)] }),
        new TableRow({ children: [dataCell('스타터', 2400), dataCell('100장', 2000, { center: true }), dataCell('10,000원', 2800, { center: true }), dataCell('100원/장', 2546, { center: true })] }),
        new TableRow({ children: [dataCell('스탠다드', 2400, { fill: C.PRIMARY_L }), dataCell('500장', 2000, { center: true, fill: C.PRIMARY_L }), dataCell('45,000원', 2800, { center: true, fill: C.PRIMARY_L }), dataCell('90원/장', 2546, { center: true, fill: C.PRIMARY_L, color: C.PRIMARY, bold: true })] }),
        new TableRow({ children: [dataCell('프리미엄', 2400), dataCell('1,000장', 2000, { center: true }), dataCell('80,000원', 2800, { center: true }), dataCell('80원/장', 2546, { center: true })] }),
        new TableRow({ children: [dataCell('엔터프라이즈', 2400, { fill: C.AMBER_L }), dataCell('5,000장', 2000, { center: true, fill: C.AMBER_L }), dataCell('350,000원', 2800, { center: true, fill: C.AMBER_L }), dataCell('70원/장', 2546, { center: true, fill: C.AMBER_L, color: C.AMBER, bold: true })] }),
      ],
    }),
    ...gap(1),
    heading2('3-3.  캠페인 생성 시 쿠폰 보상 설정'),
    ...gap(1),
    flowBox([
      '  보상 타입 선택: [포인트]  [쿠폰]  [외부 상품]',
      '      |',
      '      +── "쿠폰" 선택',
      '              |',
      '              v',
      '          현재 잔고 표시: "보유 쿠폰: 500장"',
      '              |',
      '              v',
      '          지급 수량 입력: 완료 시 쿠폰 [ 3 ] 장',
      '              |',
      '              v',
      '          예상 소요 자동 계산:',
      '          "최대 100명 x 3장 = 최대 300장 소요"',
      '              |',
      '              +── 잔고 부족 ──> "쿠폰 상점에서 구매하세요" 버튼',
      '              |',
      '              +── 잔고 충분',
      '                      |',
      '                      v',
      '                  캠페인 생성 완료',
      '                  300장 escrow 예약',
      '                  (캠페인 종료 시 미사용분 자동 반환)',
    ]),
    pageBreak(),
  ];
}

// === 4. 추첨기 ===
function makeSection4() {
  return [
    heading1('4.  추첨기  (잭팟)  시스템'),
    ...gap(1),
    heading2('4-1.  추첨기 등급'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2800, 2200, 4746],
      rows: [
        new TableRow({ children: [headerCell('등급', 2800), headerCell('필요 쿠폰', 2200), headerCell('특징', 4746)] }),
        new TableRow({ children: [dataCell('일반 추첨기', 2800), dataCell('1장', 2200, { center: true }), dataCell('소액 포인트 및 쿠폰 보상 위주', 4746)] }),
        new TableRow({ children: [dataCell('고급 추첨기', 2800, { fill: C.PRIMARY_L }), dataCell('5장', 2200, { center: true, fill: C.PRIMARY_L, bold: true, color: C.PRIMARY }), dataCell('고가 포인트 및 경품 포함', 4746, { fill: C.PRIMARY_L })] }),
        new TableRow({ children: [dataCell('잭팟 추첨기', 2800, { fill: C.AMBER_L }), dataCell('20장', 2200, { center: true, fill: C.AMBER_L, bold: true, color: C.AMBER }), dataCell('대형 상품, 낮은 확률, 고수익', 4746, { fill: C.AMBER_L })] }),
      ],
    }),
    ...gap(1),
    heading2('4-2.  보상 확률 구성 예시  (일반 추첨기)'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [5000, 4746],
      rows: [
        new TableRow({ children: [headerCell('보상', 5000), headerCell('확률', 4746)] }),
        new TableRow({ children: [dataCell('꽝  (위로 쿠폰 0.5장 반환)', 5000), dataCell('40%', 4746, { center: true })] }),
        new TableRow({ children: [dataCell('포인트 100P', 5000, { fill: C.GRAY_L }), dataCell('30%', 4746, { center: true, fill: C.GRAY_L })] }),
        new TableRow({ children: [dataCell('포인트 500P', 5000), dataCell('15%', 4746, { center: true })] }),
        new TableRow({ children: [dataCell('포인트 1,000P', 5000, { fill: C.PRIMARY_L }), dataCell('8%', 4746, { center: true, fill: C.PRIMARY_L })] }),
        new TableRow({ children: [dataCell('쿠폰 3장', 5000, { fill: C.GREEN_L }), dataCell('5%', 4746, { center: true, fill: C.GREEN_L, color: C.GREEN, bold: true })] }),
        new TableRow({ children: [dataCell('특별 경품', 5000, { fill: C.AMBER_L }), dataCell('2%', 4746, { center: true, fill: C.AMBER_L, color: C.AMBER, bold: true })] }),
      ],
    }),
    ...gap(1),
    heading2('4-3.  추첨 플로우'),
    ...gap(1),
    flowBox([
      '  유저 → 추첨기 페이지 접속',
      '      |',
      '      v',
      '  추첨기 등급 선택  (일반 / 고급 / 잭팟)',
      '      |',
      '      v',
      '  "쿠폰 N장으로 추첨하시겠습니까?" 확인 팝업',
      '      |',
      '      +── 쿠폰 부족 ──> "쿠폰이 부족합니다" + 이벤트 안내',
      '      |',
      '      +── 쿠폰 충분',
      '              |',
      '              v',
      '          DB 트랜잭션: 쿠폰 차감  (원자적 처리)',
      '              |',
      '              v',
      '          서버에서 확률 계산  (클라이언트 조작 불가)',
      '              |',
      '              v',
      '          lottery_results 테이블에 결과 저장',
      '              |',
      '              v',
      '          클라이언트에 결과 반환  ->  애니메이션 재생',
      '          (슬롯머신 / 룰렛 연출)',
      '              |',
      '              v',
      '          보상 지급  +  결과 팝업',
      '          (포인트 -> 즉시 적립 / 쿠폰 -> 재지급)',
    ]),
    pageBreak(),
  ];
}

// === 5. DB 설계 ===
function makeSection5() {
  return [
    heading1('5.  데이터베이스 설계'),
    ...gap(1),
    heading2('5-1.  신규 테이블 목록'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3200, 6546],
      rows: [
        new TableRow({ children: [headerCell('테이블명', 3200), headerCell('설명', 6546)] }),
        new TableRow({ children: [dataCell('UserCouponBalance', 3200, { bold: true }), dataCell('유저별 쿠폰 잔고 (1:1)', 6546)] }),
        new TableRow({ children: [dataCell('CouponTransaction', 3200, { bold: true, fill: C.PRIMARY_L }), dataCell('쿠폰 획득/사용 이력 통합 관리', 6546, { fill: C.PRIMARY_L })] }),
        new TableRow({ children: [dataCell('Attendance', 3200, { bold: true }), dataCell('유저 출석 기록 (userId + date 복합 unique)', 6546)] }),
        new TableRow({ children: [dataCell('ReferralLog', 3200, { bold: true, fill: C.GREEN_L }), dataCell('친구 초대 기록 (피초대자 중복 방지)', 6546, { fill: C.GREEN_L })] }),
        new TableRow({ children: [dataCell('OperatorCouponBalance', 3200, { bold: true }), dataCell('운영자 쿠폰 잔고 + escrow(예약분) 분리 관리', 6546)] }),
        new TableRow({ children: [dataCell('CouponPurchase', 3200, { bold: true, fill: C.AMBER_L }), dataCell('운영자 쿠폰 구매 이력 (결제 ID 포함)', 6546, { fill: C.AMBER_L })] }),
        new TableRow({ children: [dataCell('LotteryResult', 3200, { bold: true }), dataCell('추첨 실행 결과 이력', 6546)] }),
      ],
    }),
    ...gap(1),
    heading2('5-2.  CouponTxType Enum'),
    bodyText('쿠폰 거래 이력의 타입을 분류합니다.'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3400, 6346],
      rows: [
        new TableRow({ children: [headerCell('타입', 3400), headerCell('설명', 6346)] }),
        new TableRow({ children: [dataCell('ATTENDANCE', 3400, { bold: true }), dataCell('출석체크 쿠폰 획득', 6346)] }),
        new TableRow({ children: [dataCell('ATTENDANCE_BONUS', 3400, { bold: true, fill: C.PRIMARY_L }), dataCell('7일 연속 출석 보너스', 6346, { fill: C.PRIMARY_L })] }),
        new TableRow({ children: [dataCell('REFERRAL_SENT', 3400, { bold: true }), dataCell('친구 초대 성공 (초대자 보상)', 6346)] }),
        new TableRow({ children: [dataCell('REFERRAL_RECEIVED', 3400, { bold: true, fill: C.GREEN_L }), dataCell('초대 링크로 가입 (피초대자 보상)', 6346, { fill: C.GREEN_L })] }),
        new TableRow({ children: [dataCell('CAMPAIGN_REWARD', 3400, { bold: true }), dataCell('캠페인 미션 완료 보상', 6346)] }),
        new TableRow({ children: [dataCell('LOTTERY_USE', 3400, { bold: true, fill: C.AMBER_L }), dataCell('추첨기 사용 (음수 값으로 차감 기록)', 6346, { fill: C.AMBER_L })] }),
        new TableRow({ children: [dataCell('LOTTERY_WIN_COUPON', 3400, { bold: true }), dataCell('추첨 당첨 쿠폰 보상 지급', 6346)] }),
        new TableRow({ children: [dataCell('ADMIN_GRANT', 3400, { bold: true, fill: C.GRAY_L }), dataCell('관리자 수동 지급', 6346, { fill: C.GRAY_L })] }),
      ],
    }),
    pageBreak(),
  ];
}

// === 6. API ===
function makeSection6() {
  return [
    heading1('6.  API  엔드포인트'),
    ...gap(1),
    heading2('6-1.  유저용 API'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1400, 4400, 3946],
      rows: [
        new TableRow({ children: [headerCell('Method', 1400), headerCell('경로', 4400), headerCell('설명', 3946)] }),
        new TableRow({ children: [dataCell('POST', 1400, { center: true, color: C.GREEN, bold: true }), dataCell('/api/attendance/checkin', 4400, { font: 'Consolas' }), dataCell('출석체크 실행', 3946)] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true, fill: C.GRAY_L }), dataCell('/api/attendance/status', 4400, { fill: C.GRAY_L }), dataCell('오늘 체크 여부 + 연속 일수', 3946, { fill: C.GRAY_L })] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true }), dataCell('/api/referral/link', 4400), dataCell('내 초대 링크 조회', 3946)] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true, fill: C.GRAY_L }), dataCell('/api/referral/stats', 4400, { fill: C.GRAY_L }), dataCell('초대 현황 (초대수 / 획득 쿠폰)', 3946, { fill: C.GRAY_L })] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true }), dataCell('/api/coupons/balance', 4400), dataCell('내 쿠폰 잔고 조회', 3946)] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true, fill: C.GRAY_L }), dataCell('/api/coupons/history', 4400, { fill: C.GRAY_L }), dataCell('쿠폰 거래 이력', 3946, { fill: C.GRAY_L })] }),
        new TableRow({ children: [dataCell('POST', 1400, { center: true, color: C.GREEN, bold: true }), dataCell('/api/lottery/spin', 4400), dataCell('추첨기 실행', 3946)] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true, fill: C.GRAY_L }), dataCell('/api/lottery/history', 4400, { fill: C.GRAY_L }), dataCell('추첨 이력 조회', 3946, { fill: C.GRAY_L })] }),
      ],
    }),
    ...gap(1),
    heading2('6-2.  운영자용 API'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1400, 4800, 3546],
      rows: [
        new TableRow({ children: [headerCell('Method', 1400), headerCell('경로', 4800), headerCell('설명', 3546)] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true }), dataCell('/api/ops/coupon-store/packages', 4800), dataCell('구매 가능 패키지 목록', 3546)] }),
        new TableRow({ children: [dataCell('POST', 1400, { center: true, color: C.GREEN, bold: true, fill: C.GRAY_L }), dataCell('/api/ops/coupon-store/purchase', 4800, { fill: C.GRAY_L }), dataCell('쿠폰 패키지 구매', 3546, { fill: C.GRAY_L })] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true }), dataCell('/api/ops/coupon-store/balance', 4800), dataCell('운영자 쿠폰 잔고 조회', 3546)] }),
        new TableRow({ children: [dataCell('GET', 1400, { center: true, color: C.PRIMARY, bold: true, fill: C.GRAY_L }), dataCell('/api/ops/coupon-store/history', 4800, { fill: C.GRAY_L }), dataCell('구매 이력', 3546, { fill: C.GRAY_L })] }),
      ],
    }),
    pageBreak(),
  ];
}

// === 7. 화면 목록 ===
function makeSection7() {
  return [
    heading1('7.  화면  목록'),
    ...gap(1),
    heading2('7-1.  유저 화면'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 2800, 4546],
      rows: [
        new TableRow({ children: [headerCell('화면명', 2400), headerCell('위치', 2800), headerCell('주요 구성 요소', 4546)] }),
        new TableRow({ children: [dataCell('출석체크', 2400, { bold: true }), dataCell('홈 or 마이페이지', 2800), dataCell('달력 뷰, 연속 스트릭 표시, 오늘 체크 버튼', 4546)] }),
        new TableRow({ children: [dataCell('친구 초대', 2400, { bold: true, fill: C.GREEN_L }), dataCell('마이페이지 > 초대', 2800, { fill: C.GREEN_L }), dataCell('초대 링크 복사, 카카오 공유, 초대 현황', 4546, { fill: C.GREEN_L })] }),
        new TableRow({ children: [dataCell('쿠폰 지갑', 2400, { bold: true }), dataCell('마이페이지 > 쿠폰', 2800), dataCell('보유 쿠폰 수 (크게), 거래 이력 리스트', 4546)] }),
        new TableRow({ children: [dataCell('추첨기', 2400, { bold: true, fill: C.AMBER_L }), dataCell('메인 메뉴 탭', 2800, { fill: C.AMBER_L }), dataCell('등급 선택, 쿠폰 소모 수, 애니메이션, 결과 팝업', 4546, { fill: C.AMBER_L })] }),
      ],
    }),
    ...gap(1),
    heading2('7-2.  운영자 화면'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 2800, 4546],
      rows: [
        new TableRow({ children: [headerCell('화면명', 2400), headerCell('위치', 2800), headerCell('주요 구성 요소', 4546)] }),
        new TableRow({ children: [dataCell('쿠폰 상점', 2400, { bold: true }), dataCell('Ops 대시보드', 2800), dataCell('패키지 선택 카드, 결제, 현재 잔고 표시', 4546)] }),
        new TableRow({ children: [dataCell('캠페인 보상 설정', 2400, { bold: true, fill: C.PRIMARY_L }), dataCell('캠페인 생성 (기존 수정)', 2800, { fill: C.PRIMARY_L }), dataCell('보상 타입에 "쿠폰" 옵션 추가, 잔고 부족 시 상점 링크', 4546, { fill: C.PRIMARY_L })] }),
      ],
    }),
    ...gap(1),
    heading2('7-3.  관리자(어드민) 화면'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 2800, 4546],
      rows: [
        new TableRow({ children: [headerCell('화면명', 2400), headerCell('위치', 2800), headerCell('주요 구성 요소', 4546)] }),
        new TableRow({ children: [dataCell('쿠폰 현황 대시보드', 2400, { bold: true }), dataCell('Admin 패널', 2800), dataCell('총 발행/소비 수, 일별 출석 통계, 추첨 통계', 4546)] }),
        new TableRow({ children: [dataCell('추첨 확률 관리', 2400, { bold: true, fill: C.GRAY_L }), dataCell('Admin 패널', 2800, { fill: C.GRAY_L }), dataCell('등급별 보상 항목 및 확률값 수정', 4546, { fill: C.GRAY_L })] }),
        new TableRow({ children: [dataCell('수동 쿠폰 지급', 2400, { bold: true }), dataCell('Admin 패널', 2800), dataCell('특정 유저에게 쿠폰 직접 지급', 4546)] }),
      ],
    }),
    pageBreak(),
  ];
}

// === 8. 개발 우선순위 ===
function makeSection8() {
  return [
    heading1('8.  개발  우선순위'),
    ...gap(1),
    heading2('Phase 1  —  핵심 기능  (1~2주)'),
    infoBox([
      '목표: 쿠폰 지급 및 지갑 기능 완성',
    ], C.PRIMARY_L, C.PRIMARY),
    ...gap(1),
    numbered('Prisma 스키마 추가 및 DB 마이그레이션'),
    numbered('출석체크 API 개발'),
    numbered('출석체크 UI 화면 (달력 + 버튼)'),
    numbered('쿠폰 지갑 API + 마이페이지 UI'),
    numbered('캠페인 완료 시 쿠폰 지급 로직 (기존 보상 시스템 연동)'),
    ...gap(1),
    heading2('Phase 2  —  수익화 기능  (2~3주)'),
    infoBox([
      '목표: 운영자 쿠폰 상점 및 친구 초대 완성',
    ], C.GREEN_L, C.GREEN),
    ...gap(1),
    numbered('친구 초대 링크 생성 + 추적 시스템'),
    numbered('운영자 쿠폰 상점 UI'),
    numbered('PG사 결제 연동'),
    numbered('캠페인 생성 화면에 쿠폰 보상 옵션 추가'),
    numbered('Escrow 예약 로직 구현'),
    ...gap(1),
    heading2('Phase 3  —  게임 요소  (3~4주)'),
    infoBox([
      '목표: 추첨기 완성 및 어드민 관리 도구',
    ], C.AMBER_L, C.AMBER),
    ...gap(1),
    numbered('추첨기 페이지 + 슬롯머신 / 룰렛 애니메이션'),
    numbered('추첨 확률 어드민 관리 화면'),
    numbered('추첨 결과 통계 대시보드'),
    numbered('쿠폰 현황 어드민 대시보드'),
    pageBreak(),
  ];
}

// === 9. 보안 ===
function makeSection9() {
  return [
    heading1('9.  보안  /  어뷰징  방지'),
    ...gap(1),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3200, 6546],
      rows: [
        new TableRow({ children: [headerCell('위험 유형', 3200), headerCell('방지 방법', 6546)] }),
        new TableRow({ children: [dataCell('출석 중복 요청', 3200), dataCell('DB unique(userId, date) + 서버 idempotency 체크', 6546)] }),
        new TableRow({ children: [dataCell('자기 자신 초대', 3200, { fill: C.PRIMARY_L }), dataCell('referrerId !== refereeId 서버 검증', 6546, { fill: C.PRIMARY_L })] }),
        new TableRow({ children: [dataCell('계정 다중 생성 후 초대', 3200), dataCell('이메일 / 전화번호 인증 필수, IP 기반 제한', 6546)] }),
        new TableRow({ children: [dataCell('추첨 결과 조작', 3200, { fill: C.AMBER_L }), dataCell('확률 계산은 서버 전용 처리 — 클라이언트는 결과만 수신', 6546, { fill: C.AMBER_L })] }),
        new TableRow({ children: [dataCell('쿠폰 잔고 음수', 3200), dataCell('DB 트랜잭션 + 차감 전 잔고 충분 여부 검증', 6546)] }),
        new TableRow({ children: [dataCell('운영자 초과 사용', 3200, { fill: C.GREEN_L }), dataCell('캠페인 생성 시 escrow 예약으로 실잔고 보호', 6546, { fill: C.GREEN_L })] }),
        new TableRow({ children: [dataCell('추첨 기록 미저장 후 재요청', 3200), dataCell('차감과 결과 저장을 동일 트랜잭션으로 처리', 6546)] }),
      ],
    }),
    ...gap(2),
    infoBox([
      '핵심 원칙',
      '',
      '모든 쿠폰 증감은 CouponTransaction에 이력을 남겨 추적 가능하게 유지합니다.',
      '잔고(UserCouponBalance)는 트랜잭션 기록의 sum으로 언제든 재계산 가능해야 합니다.',
      '추첨 결과는 반드시 DB 저장 완료 후 클라이언트에 응답합니다.',
    ], C.PRIMARY_L, C.PRIMARY),
  ];
}

// ────────────────────────────────────────────────────────────
//  문서 생성
// ────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '-',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 440, hanging: 220 } } },
        }],
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 440, hanging: 220 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            run('pickku  쿠폰 시스템 기획서', { size: 16, color: C.GRAY }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER } },
          spacing: spacing(0, 80),
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            run('- ', { size: 16, color: C.GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.GRAY }),
            run(' -', { size: 16, color: C.GRAY }),
          ],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER } },
          spacing: spacing(80, 0),
        })],
      }),
    },
    children: [
      ...makeCoverPage(),
      ...makeSection1(),
      ...makeSection2(),
      ...makeSection3(),
      ...makeSection4(),
      ...makeSection5(),
      ...makeSection6(),
      ...makeSection7(),
      ...makeSection8(),
      ...makeSection9(),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('pickku_쿠폰시스템_기획서.docx', buf);
  console.log('생성 완료: pickku_쿠폰시스템_기획서.docx');
}).catch(e => {
  console.error('오류:', e.message);
  process.exit(1);
});
