import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authOptional, authRequired, requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { pickUniformUnique, pickWeightedUnique } from "../lib/lottery.js";
import { isOperator } from "../lib/roles.js";

const router = Router();

/** 공개 캠페인 또는 운영자만 비공개(초안 등) 열람 */
function canSeeCampaign(role: string | undefined, status: string) {
  if (status === "ACTIVE" || status === "CLOSED" || status === "DRAWN") return true;
  return isOperator(role);
}

router.get("/", authOptional, async (req: AuthedRequest, res) => {
  const role = req.user?.role;
  const where =
    isOperator(role)
      ? {}
      : { OR: [{ status: "ACTIVE" }, { status: "CLOSED" }, { status: "DRAWN" }] };

  const list = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { id: true, email: true } }, missions: { select: { id: true } } },
  });
  res.json(list);
});

const createCampaignSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  winnerCount: z.number().int().positive().optional(),
  lotteryMode: z.enum(["SIMPLE", "WEIGHTED"]).optional(),
  autoApprove: z.boolean().optional(),
  totalRewardPoints: z.number().int().nonnegative().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

router.post("/", authRequired, requireRoles("MANAGER", "ADMIN"), async (req: AuthedRequest, res) => {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const b = parsed.data;
  const c = await prisma.campaign.create({
    data: {
      title: b.title,
      description: b.description ?? "",
      creatorId: req.user!.id,
      winnerCount: b.winnerCount ?? 1,
      totalRewardPoints: b.totalRewardPoints ?? 0,
      lotteryMode: b.lotteryMode ?? "SIMPLE",
      autoApprove: b.autoApprove ?? true,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      status: req.user!.role === "ADMIN" ? "ACTIVE" : "DRAFT",
    },
  });
  res.status(201).json(c);
});

const patchCampaignSchema = createCampaignSchema.partial();

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
  const parsed = patchCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const b = parsed.data;
  const updated = await prisma.campaign.update({
    where: { id: c.id },
    data: {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.description !== undefined && { description: b.description }),
      ...(b.winnerCount !== undefined && { winnerCount: b.winnerCount }),
      ...(b.lotteryMode !== undefined && { lotteryMode: b.lotteryMode }),
      ...(b.autoApprove !== undefined && { autoApprove: b.autoApprove }),
      ...(b.totalRewardPoints !== undefined && { totalRewardPoints: b.totalRewardPoints }),
      ...(b.startsAt !== undefined && { startsAt: b.startsAt ? new Date(b.startsAt) : null }),
      ...(b.endsAt !== undefined && { endsAt: b.endsAt ? new Date(b.endsAt) : null }),
    },
  });
  res.json(updated);
});

const missionSchema = z.object({
  type: z.enum(["LINK_VISIT", "SURVEY", "CODE", "QUIZ", "CHECKIN", "FILE_UPLOAD"]),
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

router.post("/:id/missions", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({ where: { id: cid } });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!isOperator(req.user!.role)) {
    res.status(403).json({ error: "운영자만 미션을 만들 수 있습니다." });
    return;
  }
  const parsed = missionSchema.safeParse(req.body);
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
  const list = await prisma.submission.findMany({
    where: { mission: { campaignId: c.id } },
    include: { user: { select: { id: true, email: true } }, mission: true },
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

router.post("/:id/draw", authRequired, async (req: AuthedRequest, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.findUnique({
    where: { id: cid },
    include: { missions: true, winners: true },
  });
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!isOperator(req.user!.role)) {
    res.status(403).json({ error: "운영자만 추첨할 수 있습니다." });
    return;
  }
  if (c.winners.length > 0) {
    res.status(400).json({ error: "이미 추첨이 완료되었습니다." });
    return;
  }
  const missionIds = c.missions.map((m) => m.id);
  if (missionIds.length === 0) {
    res.status(400).json({ error: "미션이 없습니다." });
    return;
  }

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

  if (picked.length === 0) {
    res.status(400).json({ error: "추첨 대상 참여자가 없습니다." });
    return;
  }

  const pointsPerPerson = c.totalRewardPoints > 0 ? Math.floor(c.totalRewardPoints / picked.length) : 0;
  
  await prisma.$transaction([
    ...picked.map((userId, i) =>
      prisma.winner.create({
        data: { campaignId: c.id, userId, rank: i + 1, points: pointsPerPerson },
      })
    ),
    ...picked.map((userId) =>
      prisma.user.update({
        where: { id: userId },
        data: { pointBalance: { increment: pointsPerPerson } },
      })
    ),
    prisma.campaign.update({
      where: { id: c.id },
      data: { status: "DRAWN", drawnAt: new Date() },
    }),
  ]);

  const winners = await prisma.winner.findMany({
    where: { campaignId: c.id },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { rank: "asc" },
  });
  res.json({ winners });
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
    select: { userId: true, missionId: true, user: { select: { email: true } } },
  });

  const byUser = new Map<string, { email: string; completed: Set<string> }>();
  for (const s of approved) {
    if (!byUser.has(s.userId)) {
      byUser.set(s.userId, { email: s.user.email, completed: new Set() });
    }
    byUser.get(s.userId)!.completed.add(s.missionId);
  }

  const completedAll = [...byUser.values()]
    .filter((u) => u.completed.size === missionIds.length)
    .map((u) => {
      const [name, domain] = u.email.split("@");
      const masked = name.length > 2 ? name.substring(0, 2) + "***" : name + "***";
      return { email: `${masked}@${domain}` };
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

export default router;
