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

  await prisma.$transaction(async (tx) => {
    // 1. Atomic check & row lock using updateMany to verify campaign isn't already drawn
    const updateResult = await tx.campaign.updateMany({
      where: { id: c.id, status: { not: "DRAWN" } },
      data: { status: "DRAWN", drawnAt: new Date() },
    });
    if (updateResult.count === 0) {
      throw new Error("ALREADY_DRAWN");
    }

    // 2. Safely create winners and award points
    for (let i = 0; i < picked.length; i++) {
      const userId = picked[i];
      await tx.winner.create({
        data: {
          campaignId: c.id,
          userId,
          rank: i + 1,
          points: totalPointsPerWinner,
          currency: "POINT",
          rewardsConfig: rewardsJsonPerWinner,
        },
      });

      if (totalPointsPerWinner > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { pointBalance: { increment: totalPointsPerWinner } },
        });
      }
    }
  });

  return {
    winners: await prisma.winner.findMany({
      where: { campaignId: c.id },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { rank: "asc" },
    }),
  };
}
