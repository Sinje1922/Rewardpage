import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { evaluateMission, parseConfig } from "../lib/missionValidate.js";
const router = Router();
const submitSchema = z.object({
    payload: z.record(z.string(), z.unknown()).default({}),
});
router.post("/:id/submit", authRequired, async (req, res) => {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const mid = String(req.params.id);
    const mission = await prisma.mission.findUnique({
        where: { id: mid },
        include: { campaign: true },
    });
    if (!mission) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const camp = mission.campaign;
    if (camp.status !== "ACTIVE") {
        res.status(400).json({ error: "진행 중인 캠페인이 아닙니다." });
        return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.blocked) {
        res.status(403).json({ error: "차단된 계정입니다." });
        return;
    }
    const now = new Date();
    if (camp.startsAt && now < camp.startsAt) {
        res.status(400).json({ error: "아직 시작 전입니다." });
        return;
    }
    if (camp.endsAt && now > camp.endsAt) {
        res.status(400).json({ error: "종료된 캠페인입니다." });
        return;
    }
    const cfg = parseConfig(mission.config);
    const evalResult = evaluateMission(mission.type, cfg, parsed.data.payload);
    if (!evalResult.ok) {
        res.status(400).json({ error: evalResult.reason ?? "검증 실패" });
        return;
    }
    const auto = camp.autoApprove;
    const status = auto ? "APPROVED" : "PENDING";
    const sub = await prisma.submission.upsert({
        where: { userId_missionId: { userId: req.user.id, missionId: mission.id } },
        create: {
            userId: req.user.id,
            missionId: mission.id,
            payload: JSON.stringify(parsed.data.payload),
            status,
        },
        update: {
            payload: JSON.stringify(parsed.data.payload),
            status,
        },
    });
    await prisma.analyticsevent.create({
        data: {
            name: "mission_submit",
            userId: req.user.id,
            meta: JSON.stringify({ missionId: mission.id, campaignId: camp.id, status }),
        },
    });
    res.json(sub);
});
const eventSchema = z.object({
    name: z.string(),
    meta: z.record(z.string(), z.unknown()).optional(),
});
router.post("/:id/event", authRequired, async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    await prisma.analyticsevent.create({
        data: {
            name: parsed.data.name,
            userId: req.user.id,
            meta: JSON.stringify({ missionId: String(req.params.id), ...(parsed.data.meta ?? {}) }),
        },
    });
    res.status(204).send();
});
export default router;
