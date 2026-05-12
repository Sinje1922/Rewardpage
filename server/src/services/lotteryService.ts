import { prisma } from "../lib/prisma.js";
import { pickUniformUnique, pickWeightedUnique } from "../lib/lottery.js";

/**
 * 전용 추첨 로직 서비스
 * API 엔드포인트와 자동 스케줄러에서 공용으로 사용합니다.
 */
export async function runCampaignDraw(campaignId: string) {
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { missions: true, winners: true },
  });

  if (!c) throw new Error("CAMPAIGN_NOT_FOUND");
  if (c.winners.length > 0) throw new Error("ALREADY_DRAWN");

  const missionIds = c.missions.map((m) => m.id);
  if (missionIds.length === 0) throw new Error("NO_MISSIONS");

  // 승인된 제출 목록 가져오기
  const approved = await prisma.submission.findMany({
    where: { missionId: { in: missionIds }, status: "APPROVED" },
    select: { userId: true, missionId: true },
  });

  const byUser = new Map<string, Set<string>>();
  for (const s of approved) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, new Set());
    byUser.get(s.userId)!.add(s.missionId);
  }

  const completedAll: string[] = [];
  const weightsUser: string[] = [];
  const weightsVal: number[] = [];

  for (const [userId, set] of byUser) {
    const n = set.size;
    if (n >= missionIds.length) completedAll.push(userId);
    if (c.lotteryMode === "WEIGHTED" && n > 0) {
      weightsUser.push(userId);
      weightsVal.push(n);
    }
  }

  let picked: string[] = [];
  if (c.lotteryMode === "WEIGHTED") {
    picked = pickWeightedUnique(weightsUser, weightsVal, c.winnerCount);
  } else {
    picked = pickUniformUnique(completedAll, c.winnerCount);
  }

  if (picked.length === 0)
    return { winners: [], msg: "NO_ELIGIBLE_PARTICIPANTS" };

  let rewards = [];
  try {
    rewards = JSON.parse(c.rewardsConfig || "[]");
  } catch (e) {
    rewards = [{ amount: c.totalRewardPoints, currency: c.rewardCurrency }];
  }
  if (rewards.length === 0) {
    rewards = [{ amount: c.totalRewardPoints, currency: c.rewardCurrency }];
  }

  const rewardsPerWinner = rewards.map((r: any) => ({
    amount: Math.floor(r.amount / picked.length),
    currency: r.currency,
  }));

  const totalPointsPerWinner = rewardsPerWinner
    .filter((r: any) => r.currency === "POINT")
    .reduce((sum: number, r: any) => sum + r.amount, 0);

  const rewardsJsonPerWinner = JSON.stringify(rewardsPerWinner);

  await prisma.$transaction([
    ...picked.map((userId, i) =>
      prisma.winner.create({
        data: {
          campaignId: c.id,
          userId,
          rank: i + 1,
          points: totalPointsPerWinner,
          currency: "POINT", // Legacy fallback
          rewardsConfig: rewardsJsonPerWinner,
        },
      }),
    ),
    ...(totalPointsPerWinner > 0
      ? picked.map((userId) =>
          prisma.user.update({
            where: { id: userId },
            data: { pointBalance: { increment: totalPointsPerWinner } },
          }),
        )
      : []),
    prisma.campaign.update({
      where: { id: c.id },
      data: { status: "DRAWN", drawnAt: new Date() },
    }),
  ]);

  return {
    winners: await prisma.winner.findMany({
      where: { campaignId: c.id },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { rank: "asc" },
    }),
  };
}
