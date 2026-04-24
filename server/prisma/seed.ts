import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {
      passwordHash: pass,
      role: "ADMIN",
    },
    create: {
      email: "admin@demo.local",
      passwordHash: pass,
      role: "ADMIN",
    },
  });

  const creator = await prisma.user.upsert({
    where: { email: "creator@demo.local" },
    update: {
      passwordHash: pass,
      role: "USER",
    },
    create: {
      email: "creator@demo.local",
      passwordHash: pass,
      role: "USER",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@demo.local" },
    update: {
      passwordHash: pass,
      role: "MANAGER",
    },
    create: {
      email: "manager@demo.local",
      passwordHash: pass,
      role: "MANAGER",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@demo.local" },
    update: {
      passwordHash: pass,
      role: "USER",
    },
    create: {
      email: "user@demo.local",
      passwordHash: pass,
      role: "USER",
    },
  });

  const existing = await prisma.campaign.findFirst({
    where: { title: "데모 캠페인" },
  });

  if (!existing) {
    const camp = await prisma.campaign.create({
      data: {
        title: "데모 캠페인",
        description: "시드 데이터 — 링크·코드·퀴즈 미션 예시",
        companyName: "데모 주식회사",
        companyLogoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=demo",
        status: "ACTIVE",
        creatorId: admin.id,
        winnerCount: 2,
        lotteryMode: "SIMPLE",
        autoApprove: true,
      },
    });

    await prisma.mission.createMany({
      data: [
        {
          campaignId: camp.id,
          type: "LINK_VISIT",
          title: "이벤트 페이지 방문",
          description: "아래 링크를 연 뒤 완료를 눌러주세요.",
          sortOrder: 0,
          config: JSON.stringify({
            linkUrl: "https://example.com",
            minDwellSeconds: 0,
          }),
        },
        {
          campaignId: camp.id,
          type: "CODE",
          title: "안내 코드 입력",
          description: "공지에 적힌 코드를 입력하세요.",
          sortOrder: 1,
          config: JSON.stringify({
            correctCode: "REWARD2026",
          }),
        },
        {
          campaignId: camp.id,
          type: "QUIZ",
          title: "간단 퀴즈",
          description: "정답을 고르세요.",
          sortOrder: 2,
          config: JSON.stringify({
            quizQuestion: "MVP에서 추천한 초기 미션 타입이 아닌 것은?",
            quizOptions: [
              "링크 방문형",
              "SNS 자동 검증형",
              "코드 입력형",
              "퀴즈형",
            ],
            correctIndex: 1,
          }),
        },
      ],
    });
  }

  // 추가 더미 데이터: 종료된 캠페인
  const closedExisting = await prisma.campaign.findFirst({
    where: { title: "지난 추억의 이벤트 (종료)" },
  });

  if (!closedExisting) {
    const closedCamp = await prisma.campaign.create({
      data: {
        title: "지난 추억의 이벤트 (종료)",
        description: "이미 종료된 이벤트입니다. 결과 보기를 테스트할 수 있습니다.",
        companyName: "과거 상사",
        status: "CLOSED",
        creatorId: admin.id,
        winnerCount: 10,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 전
      },
    });

    await prisma.mission.create({
      data: {
        campaignId: closedCamp.id,
        type: "LINK_VISIT",
        title: "옛날 홈페이지 방문",
        config: JSON.stringify({ linkUrl: "https://archive.org" }),
      },
    });
  }

  // 추가 더미 데이터: 준비 중인 캠페인
  const draftExisting = await prisma.campaign.findFirst({
    where: { title: "오픈 예정: 신규 서비스 런칭" },
  });

  if (!draftExisting) {
    await prisma.campaign.create({
      data: {
        title: "오픈 예정: 신규 서비스 런칭",
        description: "관리자만 볼 수 있는 준비 중인 캠페인 예시입니다.",
        companyName: "뉴 스타트업",
        status: "DRAFT",
        creatorId: admin.id,
      },
    });
  }

  console.log("Seed OK", {
    admin: admin.email,
    manager: "manager@demo.local",
    user: user.email,
    formerCreator: creator.email,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });