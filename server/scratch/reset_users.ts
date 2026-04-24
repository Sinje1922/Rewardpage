import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 보호하려는 테스트 계정 리스트
const PROTECTED_EMAILS = [
  'admin@demo.local',
  'manager@demo.local',
  'user@demo.local'
];

async function main() {
  console.log('--- Starting User Data Reset ---');

  // 1. 초기화 대상 유저 조회
  const targetUsers = await prisma.user.findMany({
    where: {
      NOT: {
        email: { in: PROTECTED_EMAILS }
      }
    },
    select: { id: true, email: true }
  });

  const targetIds = targetUsers.map(u => u.id);
  console.log(`Found ${targetUsers.length} users to reset:`, targetUsers.map(u => u.email));

  if (targetIds.length === 0) {
    console.log('No users to reset. Finished.');
    return;
  }

  // 2. 미션 참여 내역 및 당첨 데이터 삭제
  console.log('Deleting Submissions and Winners...');
  await prisma.submission.deleteMany({
    where: { userId: { in: targetIds } }
  });
  await prisma.winner.deleteMany({
    where: { userId: { in: targetIds } }
  });

  // 3. 프로필 정보 초기화 및 포인트 0 설정
  console.log('Resetting profiles and points...');
  await prisma.user.updateMany({
    where: { id: { in: targetIds } },
    data: {
      nickname: null,
      walletAddress: null,
      birthDate: null,
      birthYear: null,
      gender: null,
      region: null,
      avatarUrl: null,
      pointBalance: 0
    }
  });

  console.log('--- Reset Completed Successfully ---');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
