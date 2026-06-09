import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authOptional, authRequired, requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { pickUniformUnique, pickWeightedUnique } from "../lib/lottery.js";
import { isOperator } from "../lib/roles.js";

const router = Router();

function calculateRequiredBalances(rewardsConfig: any[]) {
  const reqs = {
    POINT: 0,
    USDT: 0,
    BRL: 0,
    METAQ: 0,
    COUPON: 0,
  };
  for (const r of rewardsConfig) {
    const currency = r.currency;
    const amount = Number(r.amount) || 0;
    if (currency === "POINT") {
      reqs.POINT += Math.floor(amount);
    } else if (currency === "USDT") {
      reqs.USDT += amount;
    } else if (currency === "BRL") {
      reqs.BRL += amount;
    } else if (currency === "METAQ") {
      reqs.METAQ += amount;
    } else if (currency === "COUPON") {
      reqs.COUPON += Math.floor(amount);
    }
  }
  return reqs;
}

/** 공개 캠페인 또는 운영자만 비공개(초안 등) 열람 */
function canSeeCampaign(role: string | undefined, status: string) {
  if (status === "ACTIVE" || status === "CLOSED" || status === "DRAWN") return true;
  return isOperator(role);
}

router.get("/", authOptional, async (req: AuthedRequest, res) => {
  const role = req.user?.role;
  let where: any;

  if (role === "ADMIN") {
    // 어드민: 전체 캠페인 조회
    where = {};
  } else if (role === "MANAGER") {
    // 매니저: 본인이 생성한 캠페인만 조회
    where = { creatorId: req.user!.id };
  } else {
    // 일반 유저: 공개 캠페인만 조회
    where = { OR: [{ status: "ACTIVE" }, { status: "CLOSED" }, { status: "DRAWN" }] };
  }

  const list = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { id: true, email: true } }, missions: { select: { id: true, type: true } } },
  });
  res.json(list);
});

router.get("/active-avatars", authOptional, async (req: AuthedRequest, res) => {
  try {
    const dbUsers = await prisma.user.findMany({
      where: {
        NOT: [
          { avatarUrl: null },
          { avatarUrl: "" }
        ]
      },
      select: {
        avatarUrl: true
      }
    });

    const DEFAULT_AVATARS = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80"
    ];

    const realAvatars = dbUsers.map(u => u.avatarUrl).filter(Boolean) as string[];
    const combined = [...realAvatars, ...DEFAULT_AVATARS];
    const unique = Array.from(new Set(combined));
    const shuffled = unique.sort(() => 0.5 - Math.random()).slice(0, 3);

    res.json(shuffled);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

const missionInputSchema = z.object({
  type: z.enum([
    "LINK_VISIT",
    "SURVEY",
    "CODE",
    "QUIZ",
    "CHECKIN",
    "FILE_UPLOAD",
    "TELEGRAM_JOIN",
    "DISCORD_JOIN",
    "YOUTUBE_WATCH",
    "YOUTUBE_SUBSCRIBE",
    "YOUTUBE_LIKE",
    "TELEGRAM_JOIN",
    "TELEGRAM_CHANNEL",
    "TELEGRAM_GROUP",
    "DISCORD_JOIN",
    "INSTAGRAM_FOLLOW",
    "INSTAGRAM_LIKE"
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const campaignFieldsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  companyName: z.string().optional(),
  companyLogoUrl: z.string().optional(),
  rewardImageUrl: z.string().optional(),
  winnerCount: z.number().int().positive().optional(),
  lotteryMode: z.enum(["SIMPLE", "WEIGHTED"]).optional(),
  rewardDistMode: z.enum(["COMBINED", "SEPARATE"]).optional(),
  autoApprove: z.boolean().optional(),
  totalRewardPoints: z.number().int().nonnegative().optional(),
  rewardCurrency: z.string().optional(),
  rewardsConfig: z.array(z.object({ amount: z.number().nonnegative(), currency: z.string(), winnerCount: z.number().int().positive().optional(), customCurrency: z.string().optional() })).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  drawAt: z.string().datetime().optional().nullable(),
});

const createCampaignSchema = campaignFieldsSchema.extend({
  missions: z.array(missionInputSchema).min(1, "미션을 1개 이상 구성해 주세요."),
});

const patchCampaignSchema = campaignFieldsSchema.partial().extend({
  missions: z.array(missionInputSchema).optional(),
});

async function replaceCampaignMissions(campaignId: string, missions: z.infer<typeof missionInputSchema>[], bypassSubmissionsCheck = false) {
  if (!bypassSubmissionsCheck) {
    const subCount = await prisma.submission.count({
      where: { mission: { campaignId } },
    });
    if (subCount > 0) {
      throw new Error("SUBMISSIONS_EXIST");
    }
  }
  await prisma.$transaction([
    prisma.mission.deleteMany({ where: { campaignId } }),
    prisma.mission.createMany({
      data: missions.map((m, i) => ({
        campaignId,
        type: m.type,
        title: m.title,
        description: m.description ?? "",
        sortOrder: m.sortOrder ?? i,
        config: JSON.stringify(m.config ?? {}),
      })),
    }),
  ]);
}

router.post("/", authRequired, requireRoles("MANAGER", "ADMIN"), async (req: AuthedRequest, res) => {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const b = parsed.data;

  if (b.startsAt && b.endsAt && new Date(b.endsAt) < new Date(b.startsAt)) {
    res.status(400).json({ error: "캠페인 종료 날짜는 게시 시작 날짜보다 빠를 수 없습니다." });
    return;
  }
  if (b.endsAt && b.drawAt && new Date(b.drawAt) < new Date(b.endsAt)) {
    res.status(400).json({ error: "추첨 예정 일시는 캠페인 종료 날짜보다 빠를 수 없습니다." });
    return;
  }

  const rewardsConfig = b.rewardsConfig || [];
  const required = calculateRequiredBalances(rewardsConfig);

  const creator = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { pointBalance: true, usdtBalance: true, brlBalance: true, metaqBalance: true, couponBalance: true, walletAddress: true }
  });

  if (!creator) {
    res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    return;
  }

  const hasTokenReward = rewardsConfig.some((r: any) => ["USDT", "METAQ"].includes(r.currency));
  if (hasTokenReward && !creator.walletAddress) {
    res.status(400).json({ error: "토큰 보상(USDT, METAQ)을 설정하려면 메타마스크 지갑 연동이 필수입니다." });
    return;
  }

  if (
    creator.pointBalance < required.POINT ||
    creator.usdtBalance < required.USDT ||
    creator.brlBalance < required.BRL ||
    creator.metaqBalance < required.METAQ ||
    creator.couponBalance < required.COUPON
  ) {
    res.status(400).json({ error: "보유하신 재화의 잔액이 부족합니다. 상점에서 충전 후 시도해 주세요." });
    return;
  }

  try {
    const camp = await prisma.$transaction(async (tx) => {
      // 차감 트랜잭션
      if (required.POINT > 0) {
        await tx.user.update({ where: { id: req.user!.id }, data: { pointBalance: { decrement: required.POINT } } });
      }
      if (required.USDT > 0) {
        await tx.user.update({ where: { id: req.user!.id }, data: { usdtBalance: { decrement: required.USDT } } });
      }
      if (required.BRL > 0) {
        await tx.user.update({ where: { id: req.user!.id }, data: { brlBalance: { decrement: required.BRL } } });
      }
      if (required.METAQ > 0) {
        await tx.user.update({ where: { id: req.user!.id }, data: { metaqBalance: { decrement: required.METAQ } } });
      }
      if (required.COUPON > 0) {
        await tx.user.update({ where: { id: req.user!.id }, data: { couponBalance: { decrement: required.COUPON } } });
      }

      const row = await tx.campaign.create({
        data: {
          title: b.title,
          description: b.description ?? "",
          companyName: b.companyName ?? "",
          companyLogoUrl: b.companyLogoUrl ?? "",
          rewardImageUrl: b.rewardImageUrl ?? "",
          creatorId: req.user!.id,
          winnerCount: b.winnerCount ?? 1,
          totalRewardPoints: b.totalRewardPoints ?? 0,
          rewardCurrency: b.rewardCurrency ?? "POINT",
          rewardsConfig: JSON.stringify(b.rewardsConfig ?? []),
          lotteryMode: b.lotteryMode ?? "SIMPLE",
          rewardDistMode: b.rewardDistMode ?? "COMBINED",
          autoApprove: b.autoApprove ?? true,
          startsAt: b.startsAt ? new Date(b.startsAt) : null,
          endsAt: b.endsAt ? new Date(b.endsAt) : null,
          drawAt: b.drawAt ? new Date(b.drawAt) : null,
          status: req.user!.role === "ADMIN" ? "ACTIVE" : "DRAFT",
        },
      });
      await tx.mission.createMany({
        data: b.missions.map((m, i) => ({
          campaignId: row.id,
          type: m.type,
          title: m.title,
          description: m.description ?? "",
          sortOrder: m.sortOrder ?? i,
          config: JSON.stringify(m.config ?? {}),
        })),
      });
      return row;
    });
    const full = await prisma.campaign.findUnique({
      where: { id: camp.id },
      include: {
        missions: { orderBy: { sortOrder: "asc" } },
        creator: { select: { id: true, email: true } },
      },
    });
    res.status(201).json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "캠페인 생성에 실패했습니다." });
  }
});

router.patch("/:id", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({ where: { id: cid } });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!isOperator(req.user!.role)) {
    res.status(403).json({ error: "운영자만 수정할 수 있습니다." });
    return;
  }
  // MANAGER는 본인이 생성한 캠페인만 수정 가능
  if (req.user!.role === "MANAGER" && c.creatorId !== req.user!.id) {
    res.status(403).json({ error: "본인이 생성한 캠페인만 수정할 수 있습니다." });
    return;
  }
  const parsed = patchCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("Zod Validation Error on PATCH:", JSON.stringify(parsed.error.format(), null, 2));
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const b = parsed.data;

  const startsAtVal = b.startsAt !== undefined ? b.startsAt : (c.startsAt ? c.startsAt.toISOString() : null);
  const endsAtVal = b.endsAt !== undefined ? b.endsAt : (c.endsAt ? c.endsAt.toISOString() : null);
  const drawAtVal = b.drawAt !== undefined ? b.drawAt : (c.drawAt ? c.drawAt.toISOString() : null);

  if (startsAtVal && endsAtVal && new Date(endsAtVal) < new Date(startsAtVal)) {
    res.status(400).json({ error: "캠페인 종료 날짜는 게시 시작 날짜보다 빠를 수 없습니다." });
    return;
  }
  if (endsAtVal && drawAtVal && new Date(drawAtVal) < new Date(endsAtVal)) {
    res.status(400).json({ error: "추첨 예정 일시는 캠페인 종료 날짜보다 빠를 수 없습니다." });
    return;
  }

  // MANAGER는 오직 캠페인 제목(title)과 설명(description)만 수정 가능
  if (req.user!.role === "MANAGER") {
    if (b.missions !== undefined) {
      res.status(403).json({ error: "매니저는 미션을 수정할 수 없습니다. 관리자에게 문의하세요." });
      return;
    }
    const keys = Object.keys(b).filter(k => b[k as keyof typeof b] !== undefined);
    const invalidKeys = keys.filter(k => k !== "title" && k !== "description");
    if (invalidKeys.length > 0) {
      res.status(403).json({ error: "매니저는 캠페인의 제목과 내용(설명)만 수정할 수 있습니다." });
      return;
    }
  }

  const isAdmin = req.user!.role === "ADMIN";

  const finalRewardsConfig = b.rewardsConfig !== undefined ? b.rewardsConfig : JSON.parse(c.rewardsConfig || "[]");
  const hasTokenReward = finalRewardsConfig.some((r: any) => ["USDT", "METAQ"].includes(r.currency));
  if (hasTokenReward) {
    const creator = await prisma.user.findUnique({
      where: { id: c.creatorId },
      select: { walletAddress: true }
    });
    if (!creator || !creator.walletAddress) {
      res.status(400).json({ error: "토큰 보상(USDT, METAQ)을 설정하려면 메타마스크 지갑 연동이 필수입니다." });
      return;
    }
  }

  let refundOrDeduct: { POINT: number; USDT: number; BRL: number; METAQ: number; COUPON: number } | null = null;
  if (b.rewardsConfig !== undefined) {
    let oldRewards: any[] = [];
    try {
      oldRewards = JSON.parse(c.rewardsConfig || "[]");
    } catch {
      oldRewards = [];
    }
    const oldReqs = calculateRequiredBalances(oldRewards);
    const newReqs = calculateRequiredBalances(b.rewardsConfig);

    const diff = {
      POINT: newReqs.POINT - oldReqs.POINT,
      USDT: newReqs.USDT - oldReqs.USDT,
      BRL: newReqs.BRL - oldReqs.BRL,
      METAQ: newReqs.METAQ - oldReqs.METAQ,
      COUPON: newReqs.COUPON - oldReqs.COUPON,
    };

    if (diff.POINT > 0 || diff.USDT > 0 || diff.BRL > 0 || diff.METAQ > 0 || diff.COUPON > 0) {
      const creator = await prisma.user.findUnique({
        where: { id: c.creatorId },
        select: { pointBalance: true, usdtBalance: true, brlBalance: true, metaqBalance: true, couponBalance: true }
      });
      if (!creator) {
        res.status(404).json({ error: "캠페인 생성자를 찾을 수 없습니다." });
        return;
      }
      if (
        (diff.POINT > 0 && creator.pointBalance < diff.POINT) ||
        (diff.USDT > 0 && creator.usdtBalance < diff.USDT) ||
        (diff.BRL > 0 && creator.brlBalance < diff.BRL) ||
        (diff.METAQ > 0 && creator.metaqBalance < diff.METAQ) ||
        (diff.COUPON > 0 && creator.couponBalance < diff.COUPON)
      ) {
        res.status(400).json({ error: "변경할 보상에 대한 보유 재화 잔액이 부족합니다." });
        return;
      }
    }
    refundOrDeduct = diff;
  }

  if (b.missions !== undefined) {
    if (!isAdmin && c.status !== "DRAFT" && c.status !== "PENDING_ADMIN") {
      res.status(400).json({
        error: "초안(DRAFT) 또는 검수 대기(PENDING_ADMIN) 상태에서만 미션을 일괄 수정할 수 있습니다.",
      });
      return;
    }
    if (b.missions.length === 0) {
      res.status(400).json({ error: "미션은 1개 이상이어야 합니다." });
      return;
    }
    try {
      await replaceCampaignMissions(c.id, b.missions, isAdmin);
    } catch (e) {
      if (e instanceof Error && e.message === "SUBMISSIONS_EXIST") {
        res.status(400).json({ error: "이미 참여 제출이 있어 미션을 일괄 바꿀 수 없습니다." });
        return;
      }
      throw e;
    }
  }

  const hasMeta =
    b.title !== undefined ||
    b.description !== undefined ||
    b.companyName !== undefined ||
    b.companyLogoUrl !== undefined ||
    b.rewardImageUrl !== undefined ||
    b.winnerCount !== undefined ||
    b.lotteryMode !== undefined ||
    b.rewardDistMode !== undefined ||
    b.autoApprove !== undefined ||
    b.totalRewardPoints !== undefined ||
    b.rewardCurrency !== undefined ||
    b.rewardsConfig !== undefined ||
    b.startsAt !== undefined ||
    b.endsAt !== undefined ||
    b.drawAt !== undefined;

  if (hasMeta || refundOrDeduct) {
    await prisma.$transaction(async (tx) => {
      if (refundOrDeduct) {
        const creatorId = c.creatorId;
        if (refundOrDeduct.POINT !== 0) {
          await tx.user.update({
            where: { id: creatorId },
            data: {
              pointBalance: refundOrDeduct.POINT > 0 
                ? { decrement: refundOrDeduct.POINT } 
                : { increment: Math.abs(refundOrDeduct.POINT) }
            }
          });
        }
        if (refundOrDeduct.USDT !== 0) {
          await tx.user.update({
            where: { id: creatorId },
            data: {
              usdtBalance: refundOrDeduct.USDT > 0 
                ? { decrement: refundOrDeduct.USDT } 
                : { increment: Math.abs(refundOrDeduct.USDT) }
            }
          });
        }
        if (refundOrDeduct.BRL !== 0) {
          await tx.user.update({
            where: { id: creatorId },
            data: {
              brlBalance: refundOrDeduct.BRL > 0 
                ? { decrement: refundOrDeduct.BRL } 
                : { increment: Math.abs(refundOrDeduct.BRL) }
            }
          });
        }
        if (refundOrDeduct.METAQ !== 0) {
          await tx.user.update({
            where: { id: creatorId },
            data: {
              metaqBalance: refundOrDeduct.METAQ > 0 
                ? { decrement: refundOrDeduct.METAQ } 
                : { increment: Math.abs(refundOrDeduct.METAQ) }
            }
          });
        }
        if (refundOrDeduct.COUPON !== 0) {
          await tx.user.update({
            where: { id: creatorId },
            data: {
              couponBalance: refundOrDeduct.COUPON > 0 
                ? { decrement: refundOrDeduct.COUPON } 
                : { increment: Math.abs(refundOrDeduct.COUPON) }
            }
          });
        }
      }

      if (hasMeta) {
        await tx.campaign.update({
          where: { id: c.id },
          data: {
            ...(b.title !== undefined && { title: b.title }),
            ...(b.description !== undefined && { description: b.description }),
            ...(b.companyName !== undefined && { companyName: b.companyName }),
            ...(b.companyLogoUrl !== undefined && { companyLogoUrl: b.companyLogoUrl }),
            ...(b.rewardImageUrl !== undefined && { rewardImageUrl: b.rewardImageUrl }),
            ...(b.winnerCount !== undefined && { winnerCount: b.winnerCount }),
            ...(b.lotteryMode !== undefined && { lotteryMode: b.lotteryMode }),
            ...(b.rewardDistMode !== undefined && { rewardDistMode: b.rewardDistMode }),
            ...(b.autoApprove !== undefined && { autoApprove: b.autoApprove }),
            ...(b.totalRewardPoints !== undefined && { totalRewardPoints: b.totalRewardPoints }),
            ...(b.rewardCurrency !== undefined && { rewardCurrency: b.rewardCurrency }),
            ...(b.rewardsConfig !== undefined && { rewardsConfig: JSON.stringify(b.rewardsConfig) }),
            ...(b.startsAt !== undefined && { startsAt: b.startsAt ? new Date(b.startsAt) : null }),
            ...(b.endsAt !== undefined && { endsAt: b.endsAt ? new Date(b.endsAt) : null }),
            ...(b.drawAt !== undefined && { drawAt: b.drawAt ? new Date(b.drawAt) : null }),
          },
        });
      }
    });
  }

  const full = await prisma.campaign.findUnique({
    where: { id: c.id },
    include: {
      missions: { orderBy: { sortOrder: "asc" } },
      creator: { select: { id: true, email: true } },
    },
  });
  res.json(full);
});

router.post("/:id/missions", authRequired, requireRoles("ADMIN"), async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({ where: { id: cid } });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = missionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const m = await prisma.mission.create({
    data: {
      campaignId: c.id,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      sortOrder: parsed.data.sortOrder ?? 0,
      config: JSON.stringify(parsed.data.config ?? {}),
    },
  });
  res.status(201).json(m);
});

router.get("/:id/submissions", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({ where: { id: cid } });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!isOperator(req.user!.role)) {
    res.status(403).json({ error: "운영자만 열람할 수 있습니다." });
    return;
  }
  // MANAGER는 본인 캠페인만 조회 가능
  if (req.user!.role === "MANAGER" && c.creatorId !== req.user!.id) {
    res.status(403).json({ error: "본인이 생성한 캠페인만 열람할 수 있습니다." });
    return;
  }
  const list = await prisma.submission.findMany({
    where: { mission: { campaignId: c.id } },
    include: { 
      user: true, 
      mission: true 
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

router.get("/:id/stats", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({
    where: { id: cid },
    include: { missions: true },
  });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!isOperator(req.user!.role)) {
    res.status(403).json({ error: "운영자만 열람할 수 있습니다." });
    return;
  }
  // MANAGER는 본인 캠페인만 통계 조회 가능
  if (req.user!.role === "MANAGER" && c.creatorId !== req.user!.id) {
    res.status(403).json({ error: "본인이 생성한 캠페인만 열람할 수 있습니다." });
    return;
  }
  const missionIds = c.missions.map((m) => m.id);
  const [totalSubs, approved, pending, rejected, winners] = await Promise.all([
    prisma.submission.count({ where: { missionId: { in: missionIds } } }),
    prisma.submission.count({ where: { missionId: { in: missionIds }, status: "APPROVED" } }),
    prisma.submission.count({ where: { missionId: { in: missionIds }, status: "PENDING" } }),
    prisma.submission.count({ where: { missionId: { in: missionIds }, status: "REJECTED" } }),
    prisma.winner.count({ where: { campaignId: c.id } }),
  ]);
  const byMission = await Promise.all(
    c.missions.map(async (m) => {
      const [ap, pe, re] = await Promise.all([
        prisma.submission.count({ where: { missionId: m.id, status: "APPROVED" } }),
        prisma.submission.count({ where: { missionId: m.id, status: "PENDING" } }),
        prisma.submission.count({ where: { missionId: m.id, status: "REJECTED" } }),
      ]);
      return { missionId: m.id, title: m.title, approved: ap, pending: pe, rejected: re };
    })
  );
  res.json({
    campaignId: c.id,
    missions: c.missions.length,
    submissions: { total: totalSubs, approved, pending, rejected },
    winners,
    byMission,
  });
});

import { runCampaignDraw } from "../services/lotteryService.js";

router.post("/:id/draw", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({
    where: { id: cid },
    include: { creator: true }
  });
  
  if (!c) return res.status(404).json({ error: "Not found" });
  if (!isOperator(req.user!.role)) {
    return res.status(403).json({ error: "운영자만 추첨할 수 있습니다." });
  }
  // MANAGER는 본인 캠페인만 추첨 가능
  if (req.user!.role === "MANAGER" && c.creatorId !== req.user!.id) {
    return res.status(403).json({ error: "본인이 생성한 캠페인만 추첨할 수 있습니다." });
  }

  try {
    const result = await runCampaignDraw(cid);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "추첨 실패" });
  }
});

router.get("/:id/participants", authOptional, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({
    where: { id: cid },
    include: { missions: { select: { id: true } } },
  });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const missionIds = c.missions.map((m) => m.id);
  if (missionIds.length === 0) {
    res.json({ count: 0, participants: [] });
    return;
  }

  const approved = await prisma.submission.findMany({
    where: { missionId: { in: missionIds }, status: "APPROVED" },
    select: { userId: true, missionId: true, user: { select: { email: true, nickname: true } } },
  });

  const byUser = new Map<string, { email: string; nickname: string | null; completed: Set<string> }>();
  for (const s of approved) {
    if (!byUser.has(s.userId)) {
      byUser.set(s.userId, { email: s.user.email, nickname: s.user.nickname, completed: new Set() });
    }
    byUser.get(s.userId)!.completed.add(s.missionId);
  }

  const completedAll = [...byUser.values()]
    .filter((u) => u.completed.size === missionIds.length)
    .map((u) => {
      const [name, domain] = u.email.split("@");
      const maskedEmail = name.length > 2 ? name.substring(0, 2) + "***" : name + "***";
      let maskedNickname = u.nickname;
      if (u.nickname && u.nickname.length > 2) {
        maskedNickname = u.nickname.substring(0, 2) + "***";
      } else if (u.nickname) {
        maskedNickname = u.nickname + "***";
      }
      return { 
        email: `${maskedEmail}@${domain}`,
        nickname: maskedNickname
      };
    });

  res.json({
    count: completedAll.length,
    participants: completedAll,
  });
});

router.get("/:id/winners", authOptional, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({ where: { id: cid } });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!canSeeCampaign(req.user?.role, c.status)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const list = await prisma.winner.findMany({
    where: { campaignId: c.id },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { rank: "asc" },
  });
  res.json(list);
});

router.get("/:id", authOptional, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({
    where: { id: cid },
    include: {
      missions: { orderBy: { sortOrder: "asc" } },
      creator: { select: { id: true, email: true } },
    },
  });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!canSeeCampaign(req.user?.role, c.status)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  let mySubmissions: { missionId: string; status: string }[] = [];
  if (req.user) {
    mySubmissions = await prisma.submission.findMany({
      where: { userId: req.user.id, mission: { campaignId: c.id } },
      select: { missionId: true, status: true },
    });
  }
  res.json({ ...c, mySubmissions });
});

router.get("/:id/export", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  if (!isOperator(req.user!.role)) {
    res.status(403).json({ error: "운영자만 내보낼 수 있습니다." });
    return;
  }
  // MANAGER는 본인 캠페인만 내보내기 가능
  if (req.user!.role === "MANAGER") {
    const camp = await prisma.campaign.findUnique({ where: { id: cid }, select: { creatorId: true } });
    if (!camp || camp.creatorId !== req.user!.id) {
      res.status(403).json({ error: "본인이 생성한 캠페인만 내보낼 수 있습니다." });
      return;
    }
  }

  try {
    const list = await prisma.submission.findMany({
      where: { mission: { campaignId: cid } },
      include: {
        user: true,
        mission: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // CSV Header
    let csv = "SubmissionID,CreatedAt,UserEmail,UserNickname,WalletAddress,Telegram,Discord,YouTube,Instagram,Gender,Age,Region,MissionType,MissionTitle,Payload\n";

    for (const s of list) {
      const age = s.user.birthYear ? new Date().getFullYear() - s.user.birthYear : "Unknown";
      const row = [
        s.id,
        s.createdAt.toISOString(),
        s.user.email,
        `"${(s.user.nickname || "").replace(/"/g, '""')}"`,
        `"${(s.user.walletAddress || "").replace(/"/g, '""')}"`,
        `"${(s.user.telegramHandle || "").replace(/"/g, '""')}"`,
        `"${(s.user.discordHandle || "").replace(/"/g, '""')}"`,
        `"${(s.user.youtubeHandle || "").replace(/"/g, '""')}"`,
        `"${(s.user.instagramHandle || "").replace(/"/g, '""')}"`,
        s.user.gender || "Unknown",
        age,
        s.user.region || "Unknown",
        s.mission.type,
        `"${s.mission.title.replace(/"/g, '""')}"`,
        `"${formatPayloadForCsv(s.mission.type, s.payload).replace(/"/g, '""')}"`,
      ];
      csv += row.join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="campaign_${cid}_data.csv"`);
    res.status(200).send("\uFEFF" + csv); // BOM for Excel UTF-8 support
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

function formatPayloadForCsv(type: string, payloadStr: string): string {
  try {
    const p = JSON.parse(payloadStr);
    if (type === "SURVEY") {
      if (p.answers) {
        return Object.entries(p.answers)
          .map(([q, a]) => `${q}: ${a}`)
          .join(" | ");
      }
    } else if (type === "QUIZ") {
      return `Selected: ${p.selectedIndex ?? "N/A"}`;
    } else if (type === "CODE" || type === "FILE_UPLOAD") {
      return p.code || p.fileUrl || payloadStr;
    } else if (type === "LINK_VISIT") {
      return `Dwell: ${p.dwellSeconds ?? 0}s`;
    }
    return payloadStr;
  } catch {
    return payloadStr;
  }
}

router.delete("/:id", authRequired, requireRoles("ADMIN"), async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({ where: { id: cid } });
  if (!c) {
    res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (c.status !== "DRAWN") {
        let oldRewards: any[] = [];
        try {
          oldRewards = JSON.parse(c.rewardsConfig || "[]");
        } catch {
          oldRewards = [];
        }
        const refund = calculateRequiredBalances(oldRewards);

        const creatorId = c.creatorId;
        if (refund.POINT > 0) {
          await tx.user.update({ where: { id: creatorId }, data: { pointBalance: { increment: refund.POINT } } });
        }
        if (refund.USDT > 0) {
          await tx.user.update({ where: { id: creatorId }, data: { usdtBalance: { increment: refund.USDT } } });
        }
        if (refund.BRL > 0) {
          await tx.user.update({ where: { id: creatorId }, data: { brlBalance: { increment: refund.BRL } } });
        }
        if (refund.METAQ > 0) {
          await tx.user.update({ where: { id: creatorId }, data: { metaqBalance: { increment: refund.METAQ } } });
        }
        if (refund.COUPON > 0) {
          await tx.user.update({ where: { id: creatorId }, data: { couponBalance: { increment: refund.COUPON } } });
        }
      }

      await tx.campaign.delete({ where: { id: cid } });
    });
    res.json({ success: true, message: "캠페인이 성공적으로 삭제되었습니다." });
  } catch (err: any) {
    console.error("Campaign Delete Error:", err);
    res.status(500).json({ error: "캠페인 삭제 중 서버 오류가 발생했습니다." });
  }
});

export default router;
