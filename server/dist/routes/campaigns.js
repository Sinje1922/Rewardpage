import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authOptional, authRequired, requireRoles } from "../middleware/auth.js";
import { isOperator } from "../lib/roles.js";
const router = Router();
/** 공개 캠페인 또는 운영자만 비공개(초안 등) 열람 */
function canSeeCampaign(role, status) {
    if (status === "ACTIVE" || status === "CLOSED" || status === "DRAWN")
        return true;
    return isOperator(role);
}
router.get("/", authOptional, async (req, res) => {
    const role = req.user?.role;
    const where = isOperator(role)
        ? {}
        : { OR: [{ status: "ACTIVE" }, { status: "CLOSED" }, { status: "DRAWN" }] };
    const list = await prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { id: true, email: true } }, missions: { select: { id: true } } },
    });
    res.json(list);
});
const missionInputSchema = z.object({
    type: z.enum(["LINK_VISIT", "SURVEY", "CODE", "QUIZ", "CHECKIN", "FILE_UPLOAD"]),
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
    winnerCount: z.number().int().positive().optional(),
    lotteryMode: z.enum(["SIMPLE", "WEIGHTED"]).optional(),
    autoApprove: z.boolean().optional(),
    totalRewardPoints: z.number().int().nonnegative().optional(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
});
const createCampaignSchema = campaignFieldsSchema.extend({
    missions: z.array(missionInputSchema).min(1, "미션을 1개 이상 구성해 주세요."),
});
const patchCampaignSchema = campaignFieldsSchema.partial().extend({
    missions: z.array(missionInputSchema).optional(),
});
async function replaceCampaignMissions(campaignId, missions) {
    const subCount = await prisma.submission.count({
        where: { mission: { campaignId } },
    });
    if (subCount > 0) {
        throw new Error("SUBMISSIONS_EXIST");
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
router.post("/", authRequired, requireRoles("MANAGER", "ADMIN"), async (req, res) => {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const b = parsed.data;
    try {
        const camp = await prisma.$transaction(async (tx) => {
            const row = await tx.campaign.create({
                data: {
                    title: b.title,
                    description: b.description ?? "",
                    companyName: b.companyName ?? "",
                    companyLogoUrl: b.companyLogoUrl ?? "",
                    creatorId: req.user.id,
                    winnerCount: b.winnerCount ?? 1,
                    totalRewardPoints: b.totalRewardPoints ?? 0,
                    lotteryMode: b.lotteryMode ?? "SIMPLE",
                    autoApprove: b.autoApprove ?? true,
                    startsAt: b.startsAt ? new Date(b.startsAt) : null,
                    endsAt: b.endsAt ? new Date(b.endsAt) : null,
                    status: req.user.role === "ADMIN" ? "ACTIVE" : "DRAFT",
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "캠페인 생성에 실패했습니다." });
    }
});
router.patch("/:id", authRequired, async (req, res) => {
    const cid = String(req.params.id);
    const c = await prisma.campaign.findUnique({ where: { id: cid } });
    if (!c) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    if (!isOperator(req.user.role)) {
        res.status(403).json({ error: "운영자만 수정할 수 있습니다." });
        return;
    }
    const parsed = patchCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const b = parsed.data;
    if (b.missions !== undefined) {
        if (c.status !== "DRAFT" && c.status !== "PENDING_ADMIN") {
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
            await replaceCampaignMissions(c.id, b.missions);
        }
        catch (e) {
            if (e instanceof Error && e.message === "SUBMISSIONS_EXIST") {
                res.status(400).json({ error: "이미 참여 제출이 있어 미션을 일괄 바꿀 수 없습니다." });
                return;
            }
            throw e;
        }
    }
    const hasMeta = b.title !== undefined ||
        b.description !== undefined ||
        b.companyName !== undefined ||
        b.companyLogoUrl !== undefined ||
        b.winnerCount !== undefined ||
        b.lotteryMode !== undefined ||
        b.autoApprove !== undefined ||
        b.totalRewardPoints !== undefined ||
        b.startsAt !== undefined ||
        b.endsAt !== undefined;
    if (hasMeta) {
        await prisma.campaign.update({
            where: { id: c.id },
            data: {
                ...(b.title !== undefined && { title: b.title }),
                ...(b.description !== undefined && { description: b.description }),
                ...(b.companyName !== undefined && { companyName: b.companyName }),
                ...(b.companyLogoUrl !== undefined && { companyLogoUrl: b.companyLogoUrl }),
                ...(b.winnerCount !== undefined && { winnerCount: b.winnerCount }),
                ...(b.lotteryMode !== undefined && { lotteryMode: b.lotteryMode }),
                ...(b.autoApprove !== undefined && { autoApprove: b.autoApprove }),
                ...(b.totalRewardPoints !== undefined && { totalRewardPoints: b.totalRewardPoints }),
                ...(b.startsAt !== undefined && { startsAt: b.startsAt ? new Date(b.startsAt) : null }),
                ...(b.endsAt !== undefined && { endsAt: b.endsAt ? new Date(b.endsAt) : null }),
            },
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
router.post("/:id/missions", authRequired, async (req, res) => {
    const cid = String(req.params.id);
    const c = await prisma.campaign.findUnique({ where: { id: cid } });
    if (!c) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    if (!isOperator(req.user.role)) {
        res.status(403).json({ error: "운영자만 미션을 만들 수 있습니다." });
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
router.get("/:id/submissions", authRequired, async (req, res) => {
    const cid = String(req.params.id);
    const c = await prisma.campaign.findUnique({ where: { id: cid } });
    if (!c) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    if (!isOperator(req.user.role)) {
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
router.get("/:id/stats", authRequired, async (req, res) => {
    const cid = String(req.params.id);
    const c = await prisma.campaign.findUnique({
        where: { id: cid },
        include: { missions: true },
    });
    if (!c) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    if (!isOperator(req.user.role)) {
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
    const byMission = await Promise.all(c.missions.map(async (m) => {
        const [ap, pe, re] = await Promise.all([
            prisma.submission.count({ where: { missionId: m.id, status: "APPROVED" } }),
            prisma.submission.count({ where: { missionId: m.id, status: "PENDING" } }),
            prisma.submission.count({ where: { missionId: m.id, status: "REJECTED" } }),
        ]);
        return { missionId: m.id, title: m.title, approved: ap, pending: pe, rejected: re };
    }));
    res.json({
        campaignId: c.id,
        missions: c.missions.length,
        submissions: { total: totalSubs, approved, pending, rejected },
        winners,
        byMission,
    });
});
import { runCampaignDraw } from "../services/lotteryService.js";
router.post("/:id/draw", authRequired, async (req, res) => {
    const cid = String(req.params.id);
    const c = await prisma.campaign.findUnique({
        where: { id: cid },
        include: { creator: true }
    });
    if (!c)
        return res.status(404).json({ error: "Not found" });
    if (!isOperator(req.user.role)) {
        return res.status(403).json({ error: "운영자만 추첨할 수 있습니다." });
    }
    try {
        const result = await runCampaignDraw(cid);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message || "추첨 실패" });
    }
});
router.get("/:id/participants", authOptional, async (req, res) => {
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
    const byUser = new Map();
    for (const s of approved) {
        if (!byUser.has(s.userId)) {
            byUser.set(s.userId, { email: s.user.email, completed: new Set() });
        }
        byUser.get(s.userId).completed.add(s.missionId);
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
router.get("/:id/winners", authOptional, async (req, res) => {
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
router.get("/:id", authOptional, async (req, res) => {
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
    let mySubmissions = [];
    if (req.user) {
        mySubmissions = await prisma.submission.findMany({
            where: { userId: req.user.id, mission: { campaignId: c.id } },
            select: { missionId: true, status: true },
        });
    }
    res.json({ ...c, mySubmissions });
});
export default router;
