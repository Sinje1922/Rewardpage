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