import { prisma } from "../lib/prisma.js";
import { pickUniformUnique, pickWeightedUnique } from "../lib/lottery.js";
import { distributeOnChainRewards, isBlockchainConfigured } from "../lib/blockchain.js";

/**
 * 전용 추첨 로직 서비스
 * API 엔드포인트와 자동 스케줄러에서 공용으로 사용합니다.
 *
 * USDT / METAQ 보상의 경우:
 *   1. DB balanceUpdate (기록 목적)
 *   2. 온체인 distributeOnChainRewards() 호출 (실제 토큰 전송)
 *   에스크로 컨트랙트가 설정되지 않은 경우(ESCROW_CONTRACT_ADDRESS 미설정) DB만 업데이트됩니다.
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

  let rewards: any[] = [];
  try {
    rewards = JSON.parse(c.rewardsConfig || "[]");
  } catch (e) {
    rewards = [{ amount: c.totalRewardPoints, currency: c.rewardCurrency, winnerCount: c.winnerCount }];
  }
  if (rewards.length === 0) {
    rewards = [{ amount: c.totalRewardPoints, currency: c.rewardCurrency, winnerCount: c.winnerCount }];
  }

  if (c.rewardDistMode === "SEPARATE") {
    const winnerRewardsMap = new Map<string, any[]>();
    let hasAnyWinner = false;
    const refunds = { POINT: 0, USDT: 0, BRL: 0, METAQ: 0, COUPON: 0 };

    for (const r of rewards) {
      const k = r.winnerCount || 1;
      let pickedForReward: string[] = [];
      if (c.lotteryMode === "WEIGHTED") {
        pickedForReward = pickWeightedUnique(weightsUser, weightsVal, k);
      } else {
        pickedForReward = pickUniformUnique(completedAll, k);
      }

      const actualCount = pickedForReward.length;
      const perWinnerAmount = r.currency === "POINT" || r.currency === "COUPON" ? Math.floor(r.amount / k) : r.amount / k;

      // 미달 환불금 계산
      if (r.currency === "POINT") {
        refunds.POINT += Math.floor(r.amount - (perWinnerAmount * actualCount));
      } else if (r.currency === "COUPON") {
        refunds.COUPON += Math.floor(r.amount - (perWinnerAmount * actualCount));
      } else if (r.currency === "USDT") {
        refunds.USDT += Number((r.amount - (perWinnerAmount * actualCount)).toFixed(8));
      } else if (r.currency === "BRL") {
        refunds.BRL += Number((r.amount - (perWinnerAmount * actualCount)).toFixed(8));
      } else if (r.currency === "METAQ") {
        refunds.METAQ += Number((r.amount - (perWinnerAmount * actualCount)).toFixed(8));
      }

      if (pickedForReward.length > 0) {
        hasAnyWinner = true;
        if (perWinnerAmount > 0) {
          for (const userId of pickedForReward) {
            if (!winnerRewardsMap.has(userId)) {
              winnerRewardsMap.set(userId, []);
            }
            winnerRewardsMap.get(userId)!.push({
              amount: perWinnerAmount,
              currency: r.currency,
              ...(r.customCurrency && { customCurrency: r.customCurrency }),
              winnerCount: r.winnerCount || 1,
            });
          }
        }
      }
    }

    if (!hasAnyWinner) {
      return { winners: [], msg: "NO_ELIGIBLE_PARTICIPANTS" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atomic check & row lock using updateMany to verify campaign isn't already drawn
      const updateResult = await tx.campaign.updateMany({
        where: { id: c.id, status: { not: "DRAWN" } },
        data: { status: "DRAWN", drawnAt: new Date() },
      });
      if (updateResult.count === 0) {
        throw new Error("ALREADY_DRAWN");
      }

      // 캠페인 생성자 환불 처리
      const creatorId = c.creatorId;
      if (refunds.POINT > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { pointBalance: { increment: refunds.POINT } } });
      }
      if (refunds.COUPON > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { couponBalance: { increment: refunds.COUPON } } });
      }
      if (refunds.USDT > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { usdtBalance: { increment: refunds.USDT } } });
      }
      if (refunds.BRL > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { brlBalance: { increment: refunds.BRL } } });
      }
      if (refunds.METAQ > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { metaqBalance: { increment: refunds.METAQ } } });
      }

      // 2. Safely create winners and award points/currencies
      let rank = 1;
      for (const [userId, wonList] of winnerRewardsMap) {
        const totalPoints = wonList
          .filter((w: any) => w.currency === "POINT")
          .reduce((sum: number, w: any) => sum + w.amount, 0);
        const totalCoupon = wonList
          .filter((w: any) => w.currency === "COUPON")
          .reduce((sum: number, w: any) => sum + w.amount, 0);
        const totalUsdt = wonList
          .filter((w: any) => w.currency === "USDT")
          .reduce((sum: number, w: any) => sum + w.amount, 0);
        const totalBrl = wonList
          .filter((w: any) => w.currency === "BRL")
          .reduce((sum: number, w: any) => sum + w.amount, 0);
        const totalMetaq = wonList
          .filter((w: any) => w.currency === "METAQ")
          .reduce((sum: number, w: any) => sum + w.amount, 0);

        await tx.winner.create({
          data: {
            campaignId: c.id,
            userId,
            rank: rank++,
            points: totalPoints,
            currency: "POINT",
            rewardsConfig: JSON.stringify(wonList),
          },
        });

        const userUpdateData: any = {};
        if (totalPoints > 0) userUpdateData.pointBalance = { increment: totalPoints };
        if (totalCoupon > 0) userUpdateData.couponBalance = { increment: totalCoupon };
        if (totalUsdt > 0) userUpdateData.usdtBalance = { increment: totalUsdt };
        if (totalBrl > 0) userUpdateData.brlBalance = { increment: totalBrl };
        if (totalMetaq > 0) userUpdateData.metaqBalance = { increment: totalMetaq };

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: userUpdateData,
          });
        }
      }
    });

  } else {
    let picked: string[] = [];
    if (c.lotteryMode === "WEIGHTED") {
      picked = pickWeightedUnique(weightsUser, weightsVal, c.winnerCount);
    } else {
      picked = pickUniformUnique(completedAll, c.winnerCount);
    }

    if (picked.length === 0)
      return { winners: [], msg: "NO_ELIGIBLE_PARTICIPANTS" };

    const refunds = { POINT: 0, USDT: 0, BRL: 0, METAQ: 0, COUPON: 0 };
    const actualCount = picked.length;
    const k = c.winnerCount || 1;

    const rewardsPerWinner = rewards.map((r: any) => {
      const perWinnerAmount = r.currency === "POINT" || r.currency === "COUPON" ? Math.floor(r.amount / k) : r.amount / k;
      
      // 미달 환불금 계산
      if (r.currency === "POINT") {
        refunds.POINT += Math.floor(r.amount - (perWinnerAmount * actualCount));
      } else if (r.currency === "COUPON") {
        refunds.COUPON += Math.floor(r.amount - (perWinnerAmount * actualCount));
      } else if (r.currency === "USDT") {
        refunds.USDT += Number((r.amount - (perWinnerAmount * actualCount)).toFixed(8));
      } else if (r.currency === "BRL") {
        refunds.BRL += Number((r.amount - (perWinnerAmount * actualCount)).toFixed(8));
      } else if (r.currency === "METAQ") {
        refunds.METAQ += Number((r.amount - (perWinnerAmount * actualCount)).toFixed(8));
      }

      return {
        amount: perWinnerAmount,
        currency: r.currency,
        ...(r.customCurrency && { customCurrency: r.customCurrency }),
      };
    });

    const totalPointsPerWinner = rewardsPerWinner
      .filter((r: any) => r.currency === "POINT")
      .reduce((sum: number, r: any) => sum + r.amount, 0);
    const totalCouponPerWinner = rewardsPerWinner
      .filter((r: any) => r.currency === "COUPON")
      .reduce((sum: number, r: any) => sum + r.amount, 0);
    const totalUsdtPerWinner = rewardsPerWinner
      .filter((r: any) => r.currency === "USDT")
      .reduce((sum: number, r: any) => sum + r.amount, 0);
    const totalBrlPerWinner = rewardsPerWinner
      .filter((r: any) => r.currency === "BRL")
      .reduce((sum: number, r: any) => sum + r.amount, 0);
    const totalMetaqPerWinner = rewardsPerWinner
      .filter((r: any) => r.currency === "METAQ")
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

      // 캠페인 생성자 환불 처리
      const creatorId = c.creatorId;
      if (refunds.POINT > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { pointBalance: { increment: refunds.POINT } } });
      }
      if (refunds.COUPON > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { couponBalance: { increment: refunds.COUPON } } });
      }
      if (refunds.USDT > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { usdtBalance: { increment: refunds.USDT } } });
      }
      if (refunds.BRL > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { brlBalance: { increment: refunds.BRL } } });
      }
      if (refunds.METAQ > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { metaqBalance: { increment: refunds.METAQ } } });
      }

      // 2. Safely create winners and award points/currencies
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

        const userUpdateData: any = {};
        if (totalPointsPerWinner > 0) userUpdateData.pointBalance = { increment: totalPointsPerWinner };
        if (totalCouponPerWinner > 0) userUpdateData.couponBalance = { increment: totalCouponPerWinner };
        if (totalUsdtPerWinner > 0) userUpdateData.usdtBalance = { increment: totalUsdtPerWinner };
        if (totalBrlPerWinner > 0) userUpdateData.brlBalance = { increment: totalBrlPerWinner };
        if (totalMetaqPerWinner > 0) userUpdateData.metaqBalance = { increment: totalMetaqPerWinner };

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: userUpdateData,
          });
        }
      }
    });
  }

  // ─── 온체인 토큰 분배 (USDT / METAQ) ──────────────────────────────────────
  // DB 트랜잭션 완료 후, 에스크로 컨트랙트를 통해 실제 토큰 전송
  if (isBlockchainConfigured()) {
    await dispatchOnChainDistribution(c.id);
  } else {
    console.log(`[LotteryService] ESCROW_CONTRACT_ADDRESS 미설정 — 온체인 분배 건너뜀 (DB만 업데이트)`);
  }

  return {
    winners: await prisma.winner.findMany({
      where: { campaignId: c.id },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { rank: "asc" },
    }),
  };
}

/**
 * 추첨 완료된 캠페인의 USDT/METAQ 보상을 온체인으로 분배하는 내부 헬퍼
 */
async function dispatchOnChainDistribution(campaignId: string) {
  try {
    // 당첨자 목록 조회 (지갑 주소 포함)
    const winners = await prisma.winner.findMany({
      where: { campaignId },
      include: {
        user: { select: { id: true, email: true, walletAddress: true } },
      },
      orderBy: { rank: "asc" },
    });

    if (winners.length === 0) return;

    // 토큰별 당첨자 그룹화
    const usdtWinners: { walletAddress: string; amount: number }[] = [];
    const metaqWinners: { walletAddress: string; amount: number }[] = [];

    for (const winner of winners) {
      if (!winner.user.walletAddress) {
        console.warn(`[Blockchain] 당첨자 지갑 없음: ${winner.user.email} (온체인 전송 건너뜀)`);
        continue;
      }

      let rewardsConfig: any[] = [];
      try {
        rewardsConfig = JSON.parse(winner.rewardsConfig || "[]");
      } catch {
        continue;
      }

      for (const r of rewardsConfig) {
        if (r.currency === "USDT" && r.amount > 0) {
          usdtWinners.push({ walletAddress: winner.user.walletAddress, amount: r.amount });
        }
        if (r.currency === "METAQ" && r.amount > 0) {
          metaqWinners.push({ walletAddress: winner.user.walletAddress, amount: r.amount });
        }
      }
    }

    // USDT 온체인 분배
    if (usdtWinners.length > 0) {
      console.log(`[Blockchain] USDT 온체인 분배 시작: ${usdtWinners.length}명`);
      const { txHash } = await distributeOnChainRewards(campaignId, "USDT", usdtWinners);
      console.log(`[Blockchain] USDT 분배 완료 TX: ${txHash}`);
    }

    // METAQ 온체인 분배
    if (metaqWinners.length > 0) {
      console.log(`[Blockchain] METAQ 온체인 분배 시작: ${metaqWinners.length}명`);
      const { txHash } = await distributeOnChainRewards(campaignId, "METAQ", metaqWinners);
      console.log(`[Blockchain] METAQ 분배 완료 TX: ${txHash}`);
    }

    if (usdtWinners.length === 0 && metaqWinners.length === 0) {
      console.log(`[Blockchain] USDT/METAQ 보상 없음 — 온체인 분배 불필요`);
    }
  } catch (err: any) {
    // 온체인 분배 실패는 로그만 남기고 전체 추첨을 롤백하지 않음
    // (DB는 이미 업데이트됨 — 추후 수동 재시도 가능)
    console.error(`[Blockchain] 온체인 분배 오류 (캠페인: ${campaignId}):`, err?.message || err);
    console.error("[Blockchain] ⚠️  DB는 업데이트됨. 온체인 전송은 수동으로 재시도 필요.");
  }
}
