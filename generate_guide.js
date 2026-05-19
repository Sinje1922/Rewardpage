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
// A4: 11906 × 16838 DXA  |  margins: 1134 DXA (≈2 cm)
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
const run  = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: 22, color: G1, ...opts });
const bold = (text, opts = {}) => run(text, { bold: true, ...opts });
const sp   = (n = 1) => new Paragraph({ children: [new TextRun({ text: "", size: n * 10 })] });

// ── Paragraph helpers ────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: BLUE, space: 6 } },
    children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: NAVY })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: BLUE })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, font: "Calibri", size: 24, bold: true, color: NAVY })]
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, font: "Calibri", size: 22, color: G1, ...opts })]
  });
}
function note(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    indent: { left: 400 },
    children: [
      new TextRun({ text: "NOTE  ", font: "Calibri", size: 22, bold: true, color: SKY }),
      new TextRun({ text, font: "Calibri", size: 20, color: G2, italics: true })
    ]
  });
}
function warn(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    indent: { left: 400 },
    children: [
      new TextRun({ text: "IMPORTANT  ", font: "Calibri", size: 22, bold: true, color: AMBER }),
      new TextRun({ text, font: "Calibri", size: 20, color: ORANGE })
    ]
  });
}
function bullet(text, bold_prefix = null) {
  const ch = [];
  if (bold_prefix) ch.push(new TextRun({ text: bold_prefix + " ", font: "Calibri", size: 22, bold: true, color: NAVY }));
  ch.push(new TextRun({ text, font: "Calibri", size: 22, color: G1 }));
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 50 },
    children: ch
  });
}
function sub_bullet(text) {
  return new Paragraph({
    numbering: { reference: "sub_bullets", level: 0 },
    spacing: { before: 30, after: 40 },
    children: [new TextRun({ text, font: "Calibri", size: 21, color: G2 })]
  });
}
function numbered(text, ref = "nums") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 50, after: 60 },
    children: [new TextRun({ text, font: "Calibri", size: 22, color: G1 })]
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
        children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: WHITE })]
      })]
    })] })]
  });
}

// ── Info box (colored bg) ────────────────────────────────────
function infoBox(rows_content, bg = PALE, borderColor = BLUE) {
  const children = rows_content.map(r =>
    new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: r, font: "Calibri", size: 21, color: G1 })] })
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
      new TextRun({ text: `Step ${stepNum}  `, font: "Calibri", size: 20, bold: true, color: WHITE }),
      new TextRun({ text: title, font: "Calibri", size: 24, bold: true, color: WHITE })
    ]}),
    ...lines.map(l => new Paragraph({ spacing: { before: 30, after: 30 }, children: [
      new TextRun({ text: "• " + l, font: "Calibri", size: 21, color: "D0E8F7" })
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
      children: [new Paragraph({ children: [new TextRun({ text: h, font: "Calibri", size: 20, bold: true, color: WHITE })] })]
    }))
  });
  const data_rows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: ci === 0 ? w1 : w2, type: WidthType.DXA },
      borders: bs(G4),
      shading: { fill: ri % 2 === 0 ? WHITE : PALE, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 140, right: 140 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Calibri", size: 21, color: G1 })] })]
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
  const W = [600, 2200, 3500, 3446];
  const hdrs = ["Icon", "Mission Type", "What Users Must Do", "Verification Method"];
  const hdr_row = new TableRow({
    tableHeader: true,
    children: hdrs.map((h, i) => new TableCell({
      width: { size: W[i], type: WidthType.DXA },
      borders: bs(BLUE),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: "Calibri", size: 20, bold: true, color: WHITE })] })]
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
        children: [new TextRun({ text: cell, font: "Calibri", size: ci === 0 ? 22 : 21, color: G1 })]
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
        new TextRun({ text: "pickku — User Guide  ", font: "Calibri", size: 16, color: BLUE }),
        new TextRun({ text: "\t", font: "Calibri", size: 16 }),
        new TextRun({ text: "Page ", font: "Calibri", size: 16, color: G3 }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: G3 }),
      ]
    })
  ]});
}

// ════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ════════════════════════════════════════════════════════════════
const children = [];
const P = (...items) => items.forEach(i => children.push(i));

// ── COVER PAGE ───────────────────────────────────────────────
P(
  sp(10),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: "pickku", font: "Calibri", size: 120, bold: true, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 180 },
    children: [new TextRun({ text: "Mission Reward Platform", font: "Calibri", size: 40, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 },
               bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text: "Complete Missions. Get Rewards.", font: "Calibri", size: 32, color: G2, italics: true })] }),
  sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: "Official User Guide", font: "Calibri", size: 26, bold: true, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "For Companies & Participants  |  2026", font: "Calibri", size: 22, color: G3 })] }),
  sp(2),
  new Paragraph({ children: [new PageBreak()] })
);

// ── TABLE OF CONTENTS (manual) ───────────────────────────────
P(
  h1("Table of Contents"),
  sp(1),
  ...([
    ["1.", "Platform Overview", "3"],
    ["2.", "Getting Started — Account & Profile Setup", "4"],
    ["3.", "For Participants (Users)", "6"],
    ["  3.1", "Finding & Joining Campaigns", "6"],
    ["  3.2", "Completing Missions", "8"],
    ["  3.3", "SNS Account Linking", "13"],
    ["  3.4", "My Page — Profile & Activity", "15"],
    ["4.", "For Companies (Campaign Managers)", "17"],
    ["  4.1", "Getting the Manager Role", "17"],
    ["  4.2", "Creating a Campaign (Step-by-Step)", "17"],
    ["  4.3", "Mission Configuration Guide", "21"],
    ["  4.4", "Managing Your Campaign", "27"],
    ["  4.5", "Reviewing Submissions & Running the Draw", "28"],
    ["  4.6", "Exporting Participant Data", "30"],
    ["5.", "Points & Rewards", "31"],
    ["6.", "Frequently Asked Questions", "32"],
  ].map(([n, t, pg]) => new Paragraph({
    spacing: { before: 60, after: 60 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: n + "  " + t, font: "Calibri", size: 22, color: n.trim().length <= 2 ? NAVY : G2, bold: n.trim().length <= 2 }),
      new TextRun({ text: "\t" + pg, font: "Calibri", size: 22, color: G3 }),
    ]
  }))),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// CHAPTER 1 — OVERVIEW
// ════════════════════════════════════════════════════════════════
P(
  h1("1. Platform Overview"),
  body("pickku is a B2B2C mission-based reward campaign platform. Companies create campaigns with a series of tasks (missions), and users complete those tasks to earn points and rewards."),
  sp(1),
  twoColTable(
    ["Role", "Description"],
    [
      ["Company (Manager)", "Creates and manages reward campaigns. Sets missions, prizes, and raffle rules."],
      ["User (Participant)", "Discovers campaigns, completes missions, and earns points or crypto rewards."],
      ["Admin", "Platform administrator who approves campaigns and manages all users."],
    ], 3200
  ),
  sp(1),
  h2("How It Works — The Big Picture"),
  infoBox([
    "1.  A Company creates a campaign and defines missions (e.g. visit a link, answer a quiz, join a Discord server).",
    "2.  The campaign goes live after Admin approval.",
    "3.  Users browse active campaigns, complete missions, and submit their answers.",
    "4.  When the campaign ends, winners are selected by raffle (equal or weighted) and receive points or crypto rewards.",
    "5.  The entire process — from mission verification to prize distribution — is fully automated.",
  ], PALE, BLUE),
  sp(1),
  h2("Supported Languages"),
  body("pickku is available in English, Korean (한국어), and Portuguese (Português). You can switch the language from the top navigation bar at any time."),
  sp(1),
  h2("Supported Reward Types"),
  twoColTable(
    ["Currency", "Description"],
    [
      ["POINT",  "Platform points — used for rankings and future redemption."],
      ["USDT",   "USD Tether stablecoin — transferred to your wallet address."],
      ["BRL",    "Brazilian Real — transferred via designated payment method."],
      ["METAQ",  "METAQ token — transferred to your blockchain wallet address."],
    ], 2400
  ),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// CHAPTER 2 — GETTING STARTED
// ════════════════════════════════════════════════════════════════
P(
  h1("2. Getting Started — Account & Profile Setup"),
  body("To participate in any campaign or create campaigns, you must first register an account and complete your profile."),
  sp(1),

  h2("2.1  Creating an Account"),
  body("Go to the Register page from the top navigation bar. You can sign up with:"),
  bullet("Email & Password (minimum 6 characters)", null),
  bullet("Google Account (one-click OAuth sign-in)", null),
  sp(1),
  note("After registering with Google, you will be taken directly to the Profile Setup page."),
  sp(1),

  h2("2.2  Completing Your Profile (Required)"),
  warn("You must complete your profile before you can participate in any campaign. Until your profile is complete, the platform will automatically redirect you to the Account Setup page."),
  sp(1),
  body("Fill in all required fields on the Account Setup page:"),
  sp(1),
  twoColTable(
    ["Field", "Notes"],
    [
      ["Nickname",        "Your display name on the platform."],
      ["Wallet Address",  "Your blockchain wallet address (e.g. 0x1234…). Required for receiving crypto rewards."],
      ["Date of Birth",   "Used for age-based analytics. Format: YYYY-MM-DD."],
      ["Gender",          "Male or Female."],
      ["Country",         "Select your country from the dropdown (40+ countries available)."],
    ], 3000
  ),
  sp(1),
  note("Your wallet address must be a valid format starting with 0x. Make sure it is correct — rewards are sent directly to this address."),
  sp(1),
  body("Once all fields are saved, you will be redirected to the Home page and can start exploring campaigns."),
  sp(1),

  h2("2.3  Logging In"),
  body("On the Login page, enter your email and password, or use the Sign in with Google button. After login, you will be taken to the Home page."),
  sp(1),
  body("Your login token is stored in your browser. You will remain logged in until you click Logout from the navigation menu."),
  sp(1),

  h2("2.4  Navigation Overview"),
  twoColTable(
    ["Menu Item", "Description"],
    [
      ["Home",        "Platform home page with featured campaigns and a quick-start guide."],
      ["Campaigns",   "Full list of active, upcoming, and past campaigns."],
      ["My Page",     "Your profile, SNS account links, and activity history."],
      ["Ops",         "Campaign management console (visible to Managers only)."],
      ["Admin",       "Admin dashboard (visible to Admins only)."],
      ["Logout",      "Sign out of your account."],
    ], 2400
  ),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// CHAPTER 3 — FOR USERS
// ════════════════════════════════════════════════════════════════
P(
  sectionBadge("Chapter 3  —  For Participants (Users)"),
  sp(1),
  h1("3. For Participants (Users)"),
  body("This chapter explains how to find campaigns, complete missions, and claim your rewards."),
  sp(1),

  // 3.1
  h2("3.1  Finding & Joining Campaigns"),
  body("Click Campaigns in the top navigation bar to see all available campaigns."),
  sp(1),

  h3("Browsing the Campaign List"),
  body("Each campaign card shows the following information:"),
  bullet("Campaign title and company name / logo", null),
  bullet("Status badge — Active / Ending Soon / Upcoming / Closed", null),
  bullet("Number of missions", null),
  bullet("Number of current participants", null),
  bullet("Reward per winner (points or currency)", null),
  bullet("Campaign end date", null),
  sp(1),

  h3("Filtering and Sorting"),
  twoColTable(
    ["Option", "Description"],
    [
      ["Search",       "Type keywords to search by campaign title or description."],
      ["All Status",   "Show all campaigns regardless of status."],
      ["Active",       "Show only currently active campaigns."],
      ["Upcoming",     "Show campaigns that have not yet started."],
      ["Closed",       "Show completed campaigns."],
      ["Latest",       "Sort by most recently created."],
      ["Ending Soon",  "Sort by campaigns closest to their end date."],
    ], 2800
  ),
  sp(1),

  h3("Campaign Status Explained"),
  twoColTable(
    ["Status", "Meaning"],
    [
      ["Active",       "The campaign is live. You can join and complete missions right now."],
      ["Ending Soon",  "The campaign ends within 3 days. Complete your missions quickly!"],
      ["Upcoming",     "The campaign has not started yet. Check back later."],
      ["Closed",       "The campaign has ended. No new submissions accepted."],
    ], 2800
  ),
  sp(1),

  h3("Campaign Detail Page"),
  body("Click View Detail on any campaign card to open the campaign detail page. Here you will find:"),
  bullet("Campaign title, company logo, and full description", null),
  bullet("Total prize pool and reward per winner", null),
  bullet("Campaign duration (start and end dates)", null),
  bullet("Mission list — all tasks you need to complete", null),
  bullet("Real-time participant list (users who completed all missions)", null),
  bullet("Winners section (shown after the raffle is run)", null),
  sp(1),
  note("You must be logged in to submit any mission. If you are not logged in, you will be redirected to the Login page."),
  sp(1),

  // 3.2
  h2("3.2  Completing Missions"),
  body("Each campaign contains one or more missions. Complete every mission in a campaign to be eligible for the raffle."),
  sp(1),
  warn("You can only submit each mission once. Make sure your answer is correct before clicking 'Complete & Submit'."),
  sp(1),

  h3("Mission Status Indicators"),
  twoColTable(
    ["Status", "Meaning"],
    [
      ["Not Started",  "You have not attempted this mission yet."],
      ["Pending",      "Your submission is waiting for manager review."],
      ["Approved",  "Your submission was accepted. Mission complete!"],
      ["Rejected",  "Your submission was rejected. Check the reason and resubmit if possible."],
    ], 3000
  ),
  sp(1),

  h3("Mission Types — Complete Guide"),
  body("pickku supports 13 different mission types across 5 categories. Read the instructions for each type carefully."),
  sp(1),

  // General missions
  infoBox(["  General Missions"], "DBEAFE", BLUE),
  sp(1),
  missionTable([
    ["[Link]",   "Link Visit",   "Click 'Open Link' to visit the specified URL. Stay on the page for the required minimum time.", "Server checks your recorded dwell time against the minimum required seconds."],
    ["[Code]",   "Code Input",   "Enter the exact code provided by the company (e.g. a promo code or event code).", "Server compares your input with the correct code (case-insensitive)."],
    ["[Quiz]",   "Quiz",         "Read the question and select the correct answer from the multiple-choice options.", "Server checks whether your selected option matches the correct answer index."],
    ["[Survey]", "Survey",       "Answer all questions in the survey. Questions may be open-ended (text) or multiple-choice.", "Server checks that all questions have been answered."],
    ["[Check]",  "Check-in",     "Read the mission description and click the confirmation checkbox ('I Understand').", "Automatically approved when you confirm the checkbox."],
    ["[File]",   "File Upload",  "Paste the URL of your uploaded file (e.g. a Google Drive or Dropbox link).", "Server checks that the URL field is not empty."],
  ]),
  sp(1),

  // YouTube missions
  infoBox(["  YouTube Missions  --  Requires YouTube account linking"], PALE, MINT),
  sp(1),
  note("You must link your YouTube (Google) account in My Page → SNS Account Linking before attempting YouTube missions. See Section 3.3 for details."),
  sp(1),
  missionTable([
    ["[Watch]",     "YouTube Watch",     "Click 'Open Video' to watch the specified YouTube video. Watch until the progress bar reaches the required time.", "Server verifies via YouTube API that you have watched at least the required number of seconds."],
    ["[Subscribe]", "YouTube Subscribe", "Click 'Subscribe' to visit the channel, then subscribe. Come back and click 'Verify'.", "Server calls YouTube API to confirm your account is subscribed to the channel."],
    ["[Like]",      "YouTube Like",      "Click 'Like Video' to open the video, then like it. Come back and click 'Verify'.", "Server calls YouTube API to confirm your account has liked the video."],
  ]),
  sp(1),

  // Telegram missions
  infoBox(["  Telegram Missions  --  Requires Telegram account linking"], PALE, SKY),
  sp(1),
  note("You must link your Telegram account in My Page → SNS Account Linking before attempting Telegram missions. See Section 3.3 for details."),
  sp(1),
  missionTable([
    ["[Channel]", "Telegram Channel", "Click 'Join Channel' to open the Telegram channel link. Join the channel in your Telegram app.", "Telegram Bot API verifies that your account has joined the specified channel."],
    ["[Group]",   "Telegram Group",   "Click 'Join Group' to open the Telegram group link. Join the group in your Telegram app.", "Telegram Bot API verifies that your account is a member of the specified group."],
  ]),
  sp(1),

  // Discord missions
  infoBox(["  Discord Missions  --  Requires Discord account linking"], PALE, "5865F2"),
  sp(1),
  note("You must link your Discord account in My Page → SNS Account Linking before attempting Discord missions. See Section 3.3 for details."),
  sp(1),
  missionTable([
    ["[Discord]", "Discord Join", "Click 'Join Server' to open the Discord invite link. Accept the invite in your Discord app or browser.", "Discord Bot API verifies that your Discord account is a member of the specified server."],
  ]),
  sp(1),

  // Instagram missions
  infoBox(["  Instagram Missions  --  Manual Verification"], PALE, AMBER),
  sp(1),
  warn("Instagram missions are manually reviewed by the campaign manager. There is no automatic API verification."),
  sp(1),
  missionTable([
    ["[Follow]", "Instagram Follow", "Click 'Follow' to visit the Instagram profile. Follow the account in Instagram.", "The campaign manager manually reviews and approves your submission."],
    ["[Like]",   "Instagram Like",   "Click 'Like Post' to visit the Instagram post. Like the post in Instagram.", "The campaign manager manually reviews and approves your submission."],
  ]),
  sp(1),

  h3("Step-by-Step: Submitting a Mission"),
  body("Here is the general process for completing and submitting any mission:"),
  sp(1),
  ...[
    ["Open the campaign detail page", "Navigate to the campaign and scroll to the mission list."],
    ["Read the mission instructions", "Each mission card shows the type, title, and description."],
    ["Perform the required action", "Depending on the type: visit a link, answer a question, join a group, etc."],
    ["Provide your answer (if needed)", "For Code, Quiz, Survey, or File Upload missions, type or select your answer in the input field."],
    ["Click 'Complete & Submit'", "Press the button to send your submission to the server."],
    ["Wait for verification", "The button shows 'Verifying...' while the server checks your submission."],
    ["Check the result", "If approved, the mission card shows Approved. If rejected, it shows the reason."],
  ].map(([step, desc], i) =>
    new Paragraph({
      spacing: { before: 50, after: 60 },
      indent: { left: 480, hanging: 480 },
      children: [
        new TextRun({ text: `${i + 1}.  `, font: "Calibri", size: 22, bold: true, color: BLUE }),
        new TextRun({ text: step + " — ", font: "Calibri", size: 22, bold: true, color: NAVY }),
        new TextRun({ text: desc, font: "Calibri", size: 22, color: G1 }),
      ]
    })
  ),
  sp(1),

  // 3.3
  h2("3.3  SNS Account Linking"),
  body("To complete YouTube, Telegram, or Discord missions, you must first link your social media accounts. This is done from My Page → SNS Account Linking section."),
  sp(1),

  h3("Linking Telegram"),
  stepBox(1, "Start the linking process", [
    "Go to My Page from the top navigation bar.",
    "Scroll to the SNS Account Linking section.",
    "Click the Link button next to Telegram.",
  ]),
  sp(1),
  stepBox(2, "Authorize via Telegram Bot", [
    "A new window opens with the pickku Telegram Bot.",
    "In Telegram, click the Start button to begin authorization.",
    "The bot will register your Telegram account.",
  ]),
  sp(1),
  stepBox(3, "Confirmation", [
    "The page automatically detects the link (polls every 3 seconds for up to 2 minutes).",
    "Your Telegram handle appears under the Telegram section.",
    "You can now complete Telegram missions.",
  ]),
  sp(1),
  note("Keep the Telegram Bot window open until you see your handle appear on My Page."),
  sp(1),

  h3("Linking Discord"),
  stepBox(1, "Start the linking process", [
    "Go to My Page → SNS Account Linking.",
    "Click the Link button next to Discord.",
    "You are redirected to the Discord OAuth authorization page.",
  ]),
  sp(1),
  stepBox(2, "Authorize on Discord", [
    "Log in to Discord if prompted.",
    "Click Authorize to grant pickku permission to read your account information.",
  ]),
  sp(1),
  stepBox(3, "Return to pickku", [
    "You are automatically redirected back to My Page.",
    "Your Discord handle appears under the Discord section.",
    "You can now complete Discord missions.",
  ]),
  sp(1),

  h3("Linking YouTube (Google Account)"),
  stepBox(1, "Start the linking process", [
    "Go to My Page → SNS Account Linking.",
    "Click the Link button next to YouTube.",
    "You are redirected to Google's OAuth consent screen.",
  ]),
  sp(1),
  stepBox(2, "Select your Google account", [
    "Choose the Google account that has the YouTube channel you want to use.",
    "Grant pickku permission to read your subscriptions and activity.",
  ]),
  sp(1),
  stepBox(3, "Confirmation", [
    "You are redirected back to My Page.",
    "Your YouTube handle appears under the YouTube section.",
    "You can now complete YouTube Subscribe, Like, and Watch missions.",
  ]),
  sp(1),
  warn("Make sure to select the correct Google account — your YouTube activity (subscriptions, likes) will be verified against this account."),
  sp(1),

  h3("Unlinking an SNS Account"),
  body("To unlink any connected account, click the Unlink button next to the account on My Page. You will be asked to confirm before the account is removed."),
  sp(1),

  // 3.4
  h2("3.4  My Page — Profile & Activity"),
  body("Access My Page from the top navigation bar to manage your profile and view your activity."),
  sp(1),

  h3("Profile Tab"),
  twoColTable(
    ["Setting", "Description"],
    [
      ["Nickname",          "Update your display name."],
      ["Wallet Address",    "Update your blockchain wallet for receiving rewards."],
      ["Date of Birth",     "Update your birth date."],
      ["Gender",            "Update your gender."],
      ["Country",           "Update your country."],
      ["Profile Icon",      "Upload a profile photo (JPEG/PNG/GIF/WebP, up to 2 MB)."],
      ["SNS Account Links", "Link or unlink Telegram, Discord, and YouTube accounts."],
    ], 3200
  ),
  sp(1),

  h3("Activity Tab"),
  body("The Activity tab shows your campaign history, organized into three sub-tabs:"),
  twoColTable(
    ["Sub-Tab", "What Is Shown"],
    [
      ["Active",  "Campaigns you are currently participating in (at least one mission submitted)."],
      ["Won",     "Campaigns where you were selected as a winner, including your rank and reward."],
      ["Closed",  "Campaigns that have ended, regardless of whether you won."],
    ], 2400
  ),
  sp(1),

  h3("Deleting Your Account"),
  warn("Deleting your account is permanent and cannot be undone. All your missions, points, and activity history will be erased."),
  body("To delete your account, scroll to the bottom of the Profile tab and click Delete Account. You will be asked to confirm before the account is removed."),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// CHAPTER 4 — FOR COMPANIES
// ════════════════════════════════════════════════════════════════
P(
  sectionBadge("Chapter 4  —  For Companies (Campaign Managers)", BLUE),
  sp(1),
  h1("4. For Companies (Campaign Managers)"),
  body("This chapter explains how to create campaigns, configure missions, manage submissions, and run the winner raffle."),
  sp(1),

  // 4.1
  h2("4.1  Getting the Manager Role"),
  body("By default, new accounts have the User role. To create campaigns, your account must be upgraded to Manager. Contact the platform administrator and provide your registered email address."),
  sp(1),
  infoBox([
    "Admin contact: [Insert admin contact email or form URL here]",
    "Once upgraded, the Ops menu will appear in your navigation bar.",
  ], PALE, BLUE),
  sp(1),

  // 4.2
  h2("4.2  Creating a Campaign (Step-by-Step)"),
  body("Click Ops in the navigation bar, then click New Campaign. The campaign creation wizard has three steps."),
  sp(1),

  stepBox(1, "Client & Campaign Info", [
    "Company Name — The name of your organization (displayed on the campaign card).",
    "Company Logo — Upload your logo (JPEG/PNG/GIF/WebP/SVG, max 2 MB). Appears on the campaign page.",
    "Campaign Title — A clear, descriptive title for your campaign (required).",
    "Description — Use the rich text editor to write a detailed campaign description. You can add formatting, links, and images.",
  ]),
  sp(1),

  stepBox(2, "Logistics & Rewards", [
    "Number of Winners — How many users will win a prize (minimum: 1).",
    "Raffle Mode — Choose how winners are selected (see Raffle Modes below).",
    "Auto Approve — If checked, valid submissions are automatically approved. If unchecked, you must review each submission manually.",
    "Start Date / End Date — Optional. If set, the campaign becomes active at the start date and automatically closes at the end date. If left blank, you control activation and closure manually.",
    "Rewards — Add one or more reward entries. Each entry has an Amount and a Currency (POINT / USDT / BRL / METAQ). The platform shows the estimated reward per winner automatically.",
  ]),
  sp(1),
  h3("Raffle Modes"),
  twoColTable(
    ["Mode", "How Winners Are Selected"],
    [
      ["Simple (Equal Chance)",  "All users who complete every mission have an equal chance of winning. The raffle picks randomly from all eligible participants."],
      ["Weighted (By Missions)", "Users earn one raffle ticket for each mission they complete. Completing more missions gives a proportionally higher chance of winning. This mode only applies if you have multiple missions."],
    ], 3400
  ),
  sp(1),

  stepBox(3, "Mission Setup", [
    "Click + Add Mission to add a mission to your campaign.",
    "Select the mission type from the categorized grid (see Section 4.3 for details on each type).",
    "Fill in the required fields for the selected mission type.",
    "Add as many missions as needed. Drag to reorder them if required.",
    "At least one mission is required before saving.",
  ]),
  sp(1),
  note("You can save the campaign at any time during Step 3. If you are a Manager, the campaign is saved as a Draft and must be approved by an Admin before it goes live. If you are an Admin, the campaign is immediately set to Active."),
  sp(1),

  h3("Campaign Status Flow"),
  twoColTable(
    ["Status", "Description", ],
    [
      ["Draft",         "Saved but not yet submitted for review. Visible only to you."],
      ["Pending Admin", "Submitted for Admin review. Visible only to Admins and you."],
      ["Active",        "Approved and live. Users can join and complete missions."],
      ["Closed",        "Manually closed by you or Admin. No new submissions accepted."],
      ["Drawn",         "The raffle has been run. Winners have been selected and rewarded."],
    ], 3000
  ),
  sp(1),

  // 4.3
  h2("4.3  Mission Configuration Guide"),
  body("This section provides detailed instructions for configuring each of the 13 mission types."),
  sp(1),

  // General
  h3("General Missions"),
  sp(1),

  // Link Visit
  infoBox(["Link Visit"], "E0F2FE", SKY),
  body("Require users to visit a URL and stay for a minimum amount of time."),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",          "Displayed on the mission card (e.g. 'Visit our product page')."],
      ["URL",                    "The full URL users must visit (e.g. https://www.yourwebsite.com)."],
      ["Minimum Dwell Time (s)", "Minimum time in seconds users must stay on the page (e.g. 30 for 30 seconds)."],
    ], 3400),
  sp(1),

  // Code Input
  infoBox(["Code Input"], "FEF9C3", AMBER),
  body("Require users to enter a specific code (e.g. a promo code or event password)."),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title", "Displayed on the mission card (e.g. 'Enter the event code')."],
      ["Correct Code",  "The exact code users must enter. Verification is case-insensitive (e.g. 'LAUNCH2026')."],
    ], 3400),
  sp(1),

  // Quiz
  infoBox(["Quiz"], "F0FFF4", MINT),
  body("Present a multiple-choice question with a single correct answer."),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",   "Displayed on the mission card."],
      ["Quiz Question",   "The question to ask (e.g. 'What is the launch year of our product?')."],
      ["Answer Options",  "Add 2 or more options. Click + Add Option to add more choices."],
      ["Correct Answer",  "Select the radio button next to the correct option."],
    ], 3400),
  sp(1),

  // Survey
  infoBox(["Survey"], "FDF4FF", "9333EA"),
  body("Collect structured responses from users through a series of questions."),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",        "Displayed on the mission card."],
      ["Common Note (optional)", "A note shown at the top of the survey (e.g. 'Please answer honestly')."],
      ["Survey Link (optional)", "An external link users can visit before answering (e.g. a product page)."],
      ["Questions",            "Add as many questions as needed. Each question has a Type and a Question text."],
    ], 3400),
  sp(1),
  body("Question types:"),
  twoColTable(["Question Type", "Description"],
    [
      ["Text (Open-ended)", "Users type a free-form text response."],
      ["Single Choice",     "Users select one option from a list. Add options with + Add Option."],
    ], 3200),
  sp(1),

  // Check-in
  infoBox(["Check-in"], "F0FFF4", MINT),
  body("A simple confirmation mission. Users click a checkbox to confirm they have read or understood something."),
  twoColTable(["Field", "Description"],
    [["Mission Title", "Displayed on the mission card (e.g. 'Confirm you have read the terms')."]],
    3400),
  note("Check-in missions are always automatically approved."),
  sp(1),

  // File Upload
  infoBox(["File Upload"], "FFF7ED", ORANGE),
  body("Ask users to submit a file by providing a URL to an uploaded file."),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",    "Displayed on the mission card (e.g. 'Upload your receipt')."],
      ["Upload Guide",     "Instructions for users explaining what file to upload and where (e.g. 'Upload a screenshot to Google Drive and paste the link')."],
    ], 3400),
  note("Users paste a URL to their file (Google Drive, Dropbox, etc.). You review the file manually if Auto Approve is off."),
  sp(1),

  // YouTube
  h3("YouTube Missions"),
  body("YouTube missions require users to link their Google account. Set up the YouTube mission with the following fields."),
  sp(1),

  infoBox(["YouTube Watch"], "FEF2F2", RED),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",          "Displayed on the mission card."],
      ["YouTube Video ID",       "The 11-character video ID from the YouTube URL (e.g. dQw4w9WgXcQ from youtube.com/watch?v=dQw4w9WgXcQ)."],
      ["Required Watch Time (s)", "Minimum seconds the user must watch (e.g. 60 for 1 minute)."],
    ], 3400),
  sp(1),

  infoBox(["YouTube Subscribe"], "FEF2F2", RED),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",      "Displayed on the mission card."],
      ["Channel URL",        "Full URL of your YouTube channel (e.g. https://www.youtube.com/@yourchannel)."],
      ["Channel ID",         "Your YouTube channel ID starting with UC (e.g. UCxxxxxxxxxxxxxxxxxxxxxxxx). Found in YouTube Studio → Settings → Channel → Advanced."],
    ], 3400),
  sp(1),

  infoBox(["YouTube Like"], "FEF2F2", RED),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title", "Displayed on the mission card."],
      ["Video URL",     "Full URL of the YouTube video to like."],
      ["Video ID",      "The 11-character video ID (same as in YouTube Watch above)."],
    ], 3400),
  sp(1),

  // Telegram
  h3("Telegram Missions"),
  body("Telegram missions require users to link their Telegram account. The Telegram Bot automatically verifies membership."),
  sp(1),

  infoBox(["Telegram Channel  /  Telegram Group"], "E0F2FE", SKY),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",  "Displayed on the mission card."],
      ["Telegram URL",   "The public invite link to your Telegram channel or group (e.g. https://t.me/yourchannel or https://t.me/yourgroup)."],
    ], 3400),
  note("For private channels or groups, use the invite link format: https://t.me/+xxxxxx."),
  sp(1),

  // Discord
  h3("Discord Mission"),
  body("Discord missions require users to link their Discord account. The Discord Bot verifies server membership."),
  sp(1),

  infoBox(["Discord Join"], "EEF2FF", "5865F2"),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",    "Displayed on the mission card."],
      ["Discord Invite URL", "Your Discord server invite link (e.g. https://discord.gg/xxxxxxx). Make sure the invite link does not expire."],
    ], 3400),
  warn("Discord invite links expire by default. Generate a permanent (never-expiring) invite link from your server settings."),
  sp(1),

  // Instagram
  h3("Instagram Missions"),
  body("Instagram missions are verified manually by you. There is no automatic API verification."),
  sp(1),

  infoBox(["Instagram Follow  /  Instagram Like"], "FDF4FF", "E1306C"),
  twoColTable(["Field", "Description"],
    [
      ["Mission Title",     "Displayed on the mission card."],
      ["Instagram Handle",  "(Follow) Your Instagram username without @ (e.g. yourbrand)."],
      ["Post ID",           "(Like) The unique ID of the Instagram post to like. Found in the post URL: instagram.com/p/[POST_ID]/."],
    ], 3400),
  note("Because Instagram missions are manually verified, Auto Approve should be turned OFF for these missions."),
  sp(1),

  // 4.4
  h2("4.4  Managing Your Campaign"),
  body("After creating a campaign, open the Ops Console (click Ops in the navigation) and select your campaign. The management interface has four tabs:"),
  sp(1),
  twoColTable(
    ["Tab", "What You Can Do"],
    [
      ["Compose",      "Edit your campaign info, logistics, and missions. Editing missions is only available while the campaign is in Draft or Pending Admin status."],
      ["Statistics",   "View submission counts per mission (approved / pending / rejected) and a summary of participant activity."],
      ["Participants", "See a list of all participants, their email, wallet address, SNS handles, number of completed missions, and overall status."],
      ["Winners",      "View the list of winners after the raffle has been run."],
    ], 2800
  ),
  sp(1),
  note("You can export participant data as an Excel file from the Participants tab. Click the 'Export Data (Excel)' button."),
  sp(1),

  // 4.5
  h2("4.5  Reviewing Submissions & Running the Draw"),
  sp(1),

  h3("Reviewing Submissions (Manual Approval Mode)"),
  body("If Auto Approve is turned OFF, you must review each mission submission individually."),
  body("In the Compose tab, scroll to the Mission Submissions section. For each submission, you can see:"),
  bullet("Submitter's email address", null),
  bullet("Submitted content (answer, code, file URL, dwell time, etc.)", null),
  bullet("Submission timestamp", null),
  sp(1),
  body("Click Approve ✅ to accept the submission or Reject ❌ to decline it. Rejected users may resubmit if the campaign is still active."),
  sp(1),
  note("For Quiz missions, the system shows whether the selected answer was correct or incorrect. For Survey missions, it shows the full response text."),
  sp(1),

  h3("Running the Raffle Draw"),
  warn("The draw is final and cannot be undone. Make sure all submissions have been reviewed before running the draw."),
  sp(1),
  body("You have two options for running the draw:"),
  sp(1),
  twoColTable(
    ["Method", "How It Works"],
    [
      ["Automatic Draw", "If your campaign has an End Date set, the platform automatically runs the draw within 1 minute of the campaign end time. No action needed from you."],
      ["Manual Draw",    "Click the 'Run Draw' button in the campaign management page at any time while the campaign is Active. Winners are selected immediately."],
    ], 3200
  ),
  sp(1),
  body("After the draw:"),
  bullet("Winners are listed in the Winners tab with their rank and reward amount.", null),
  bullet("Point rewards are automatically added to winners' point balances.", null),
  bullet("Crypto rewards (USDT, BRL, METAQ) must be transferred manually to the wallet addresses shown in the Winners list.", null),
  bullet("The campaign status changes to Drawn.", null),
  sp(1),

  // 4.6
  h2("4.6  Exporting Participant Data"),
  body("You can export all participant data as an Excel file for your own analysis."),
  sp(1),
  body("Go to the campaign management page → Participants tab → Click 'Export Data (Excel)'."),
  sp(1),
  body("The export includes:"),
  bullet("User email address", null),
  bullet("Wallet address", null),
  bullet("SNS handles (Telegram, Discord, YouTube, Instagram)", null),
  bullet("Gender, age group, country, and region", null),
  bullet("Number of completed missions", null),
  bullet("Submission status per mission", null),
  bullet("Survey responses and other submitted content", null),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// CHAPTER 5 — POINTS & REWARDS
// ════════════════════════════════════════════════════════════════
P(
  h1("5. Points & Rewards"),
  sp(1),

  h2("5.1  How Points Work"),
  body("Points are the primary in-platform currency. When you win a campaign with a POINT reward, the points are automatically added to your point balance."),
  body("You can see your current point balance on My Page. Points can accumulate over multiple campaigns."),
  warn("Points expire after 1 year from the date they are awarded. Make sure to use or redeem them before they expire."),
  sp(1),

  h2("5.2  How Crypto Rewards Work"),
  body("For rewards in USDT, BRL, or METAQ, the company transfers the reward directly to the wallet address you registered in your profile."),
  sp(1),
  infoBox([
    "Important: Make sure your wallet address is correct before participating in crypto-reward campaigns.",
    "Incorrectly entered wallet addresses cannot be recovered — rewards sent to wrong addresses are permanently lost.",
    "Update your wallet address in My Page → Profile at any time before the raffle is run.",
  ], "FFF7ED", AMBER),
  sp(1),

  h2("5.3  Raffle Fairness"),
  body("All raffles are run by a server-side algorithm with the following guarantees:"),
  bullet("Simple Mode: every eligible user has a mathematically equal probability of winning.", null),
  bullet("Weighted Mode: each mission completed earns one raffle ticket. The probability of winning is proportional to the number of tickets held.", null),
  bullet("The raffle process is logged and the result is final.", null),
  sp(1),

  h2("5.4  Checking Your Wins"),
  body("Visit My Page → Activity Tab → Won to see a list of all campaigns you have won, your rank, and the reward amount."),
  sp(1),
  new Paragraph({ children: [new PageBreak()] })
);

// ════════════════════════════════════════════════════════════════
// CHAPTER 6 — FAQ
// ════════════════════════════════════════════════════════════════
P(
  h1("6. Frequently Asked Questions"),
  sp(1),

  ...[
    ["I completed a mission but the status is still 'Pending'. What do I do?",
     "If the campaign has Auto Approve turned off, the manager must manually review your submission. Please wait for the manager to review your submission. If the campaign is over and your status is still Pending, contact the campaign manager."],
    ["Can I change my answer after submitting a mission?",
     "No. Each mission can only be submitted once. Make sure your answer is correct before clicking 'Complete & Submit'."],
    ["I clicked 'Verify' for a YouTube/Discord/Telegram mission but it says verification failed. What should I do?",
     "Make sure you have actually completed the required action (subscribed, joined, etc.) before clicking Verify. Also confirm that the correct social account is linked in My Page. If the issue persists, unlink and re-link your SNS account, then try again."],
    ["My wallet address is wrong. Can I update it?",
     "Yes. Go to My Page → Profile and update your wallet address. You must save the new address before the raffle is run — wallet addresses cannot be changed after you have won a campaign."],
    ["How do I know if I won?",
     "After the raffle is run, the Winners section appears on the campaign detail page. You will also see the win recorded in My Page → Activity → Won tab."],
    ["As a company, can I edit the campaign after it goes live?",
     "You can edit the campaign's basic info (title, description, company name, logo, raffle settings) at any time. However, missions cannot be added or modified once the campaign status is Active."],
    ["How long does it take for Admin to approve my campaign?",
     "Approval times depend on the administrator's schedule. Typically within 1–2 business days. You will see the campaign status change from 'Pending Admin' to 'Active' once approved."],
    ["What happens if nobody completes all missions?",
     "If no user completes all missions, the raffle will have no eligible participants and no winners will be drawn. The campaign will close with zero winners."],
    ["Can I delete a campaign after it is live?",
     "Campaigns cannot be deleted once Active. You can close a campaign early by changing its status to Closed from the campaign management page."],
    ["What languages is pickku available in?",
     "pickku currently supports English, Korean (한국어), and Portuguese (Português). Use the language switcher in the top navigation bar to change the language."],
  ].flatMap(([q, a]) => [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: "Q   ", font: "Calibri", size: 23, bold: true, color: BLUE }),
        new TextRun({ text: q, font: "Calibri", size: 23, bold: true, color: NAVY }),
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 120 },
      indent: { left: 340 },
      children: [
        new TextRun({ text: "A  ", font: "Calibri", size: 22, bold: true, color: MINT }),
        new TextRun({ text: a, font: "Calibri", size: 22, color: G1 }),
      ]
    }),
    divider(G4)
  ]),
  sp(2),

  // Closing
  new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT, type: WidthType.DXA },
      borders: bsNone(),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 280, bottom: 280, left: 400, right: 400 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "pickku", font: "Calibri", size: 60, bold: true, color: WHITE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Complete Missions. Get Rewards.", font: "Calibri", size: 26, color: SKY, italics: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "For support, contact the platform administrator.", font: "Calibri", size: 20, color: G3 })] }),
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
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
      { reference: "sub_bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 300 } } } }] },
      { reference: "nums",   levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] }
    ]
  },
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: G1 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Calibri", color: NAVY },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: BLUE },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: NAVY },
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
  fs.writeFileSync("C:\\Users\\Code7\\work\\Rewardplatform\\pickku_UserGuide.docx", buf);
  console.log("✅  pickku_UserGuide.docx created successfully.");
}).catch(err => { console.error(err); process.exit(1); });
